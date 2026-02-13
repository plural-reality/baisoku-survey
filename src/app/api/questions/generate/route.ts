import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenRouter } from "@/lib/openrouter/client";
import { buildQuestionGenerationPrompt } from "@/lib/openrouter/prompts";
import { getPhaseForQuestionIndex } from "@/lib/utils/phase";
import { z } from "zod";

const generateQuestionsSchema = z.object({
  sessionId: z.string().uuid(),
  startIndex: z.number().int().min(1),
  endIndex: z.number().int().min(1),
});

interface QuestionWithAnswer {
  question_index: number;
  statement: string;
  detail: string | null;
  options: string[];
  answers?: Array<{ selected_option: number; free_text: string | null }>;
}

interface FixedQuestionDef {
  statement: string;
  detail: string;
  options: string[];
  question_type?: string;
  scale_config?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
}

interface SessionData {
  id: string;
  purpose: string;
  background_text: string | null;
  key_questions: string[] | null;
  fixed_questions: FixedQuestionDef[] | null;
  exploration_themes: string[] | null;
  phase_profile: {
    ranges: Array<{
      start: number;
      end: number;
      phase: "exploration" | "deep-dive";
    }>;
  };
  status: string;
  current_question_index: number;
}

function extractJsonPayload(response: string): string | null {
  const fencedMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return response.slice(firstBrace, lastBrace + 1).trim();
}

function normalizeJsonPayload(raw: string): string {
  return raw.replace(/,\s*([}\]])/g, "$1").replace(/}\s*{/g, "},{");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, startIndex, endIndex } =
      generateQuestionsSchema.parse(body);

    const supabase = await createClient();

    // Fetch session
    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    const session = sessionData as SessionData | null;

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    // Fetch existing questions and answers
    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .eq("session_id", sessionId)
      .order("question_index", { ascending: true });

    const previousQA = ((existingQuestions as QuestionWithAnswer[]) || []).map(
      (q) => ({
        index: q.question_index,
        statement: q.statement,
        detail: q.detail || "",
        options: q.options as string[],
        selectedOption: q.answers?.[0]?.selected_option ?? null,
        freeText: q.answers?.[0]?.free_text ?? null,
      })
    );

    const phase = getPhaseForQuestionIndex(startIndex, session.phase_profile);

    // Resolve exploration themes (new field with key_questions fallback)
    const explorationThemes = Array.isArray(session.exploration_themes) && session.exploration_themes.length > 0
      ? session.exploration_themes as string[]
      : Array.isArray(session.key_questions) ? session.key_questions as string[] : [];

    // Determine which fixed questions fall in this batch range
    const fixedQuestions = Array.isArray(session.fixed_questions) ? session.fixed_questions as FixedQuestionDef[] : [];
    const fixedInBatch: Array<{ index: number; def: FixedQuestionDef }> = [];
    for (let i = 0; i < fixedQuestions.length; i++) {
      const fixedIndex = i + 1; // fixed questions are placed starting from Q1
      if (fixedIndex >= startIndex && fixedIndex <= endIndex) {
        fixedInBatch.push({ index: fixedIndex, def: fixedQuestions[i] });
      }
    }

    const existingIndexSet = new Set(
      ((existingQuestions as QuestionWithAnswer[]) || []).map(
        (q) => q.question_index
      )
    );

    // Insert fixed questions first
    const fixedToInsert = fixedInBatch
      .filter((f) => !existingIndexSet.has(f.index))
      .map((f) => ({
        session_id: sessionId,
        question_index: f.index,
        statement: f.def.statement,
        detail: f.def.detail,
        options: f.def.options,
        phase,
        source: "fixed" as const,
        question_type: f.def.question_type || "radio",
        scale_config: f.def.scale_config || null,
      }));

    let insertedQuestions: QuestionWithAnswer[] = [];

    if (fixedToInsert.length > 0) {
      const { data: fixedData, error: fixedInsertError } = await supabase
        .from("questions")
        .upsert(fixedToInsert, {
          onConflict: "session_id,question_index",
          ignoreDuplicates: true,
        })
        .select();

      if (fixedInsertError) {
        console.error("Fixed question insert error:", fixedInsertError);
        return NextResponse.json(
          { error: "固定質問の保存に失敗しました" },
          { status: 500 }
        );
      }

      insertedQuestions = (fixedData as QuestionWithAnswer[]) || [];
      // Mark these indices as existing
      for (const fq of fixedToInsert) {
        existingIndexSet.add(fq.question_index);
      }
    }

    // Calculate how many AI questions we still need
    const fixedIndicesInBatch = new Set(fixedInBatch.map((f) => f.index));
    const aiSlotsNeeded: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (!fixedIndicesInBatch.has(i) && !existingIndexSet.has(i)) {
        aiSlotsNeeded.push(i);
      }
    }

    if (aiSlotsNeeded.length > 0) {
      // Generate AI questions for remaining slots
      const prompt = buildQuestionGenerationPrompt({
        purpose: session.purpose,
        backgroundText: session.background_text || "",
        explorationThemes: explorationThemes.length > 0 ? explorationThemes : undefined,
        fixedQuestionsInBatch: fixedInBatch.length > 0
          ? fixedInBatch.map((f) => ({ index: f.index, statement: f.def.statement }))
          : undefined,
        previousQA,
        startIndex: aiSlotsNeeded[0],
        endIndex: aiSlotsNeeded[aiSlotsNeeded.length - 1],
        phase,
      });

      const response = await callOpenRouter([{ role: "user", content: prompt }], {
        temperature: 0.8,
      });

      // Parse JSON response
      let generatedQuestions: {
        questions: Array<{
          statement: string;
          detail: string;
          options: string[];
        }>;
      };
      try {
        const jsonPayload = extractJsonPayload(response);
        if (!jsonPayload) throw new Error("No JSON found");
        try {
          generatedQuestions = JSON.parse(jsonPayload);
        } catch {
          generatedQuestions = JSON.parse(normalizeJsonPayload(jsonPayload));
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError, response);
        return NextResponse.json(
          { error: "質問の生成に失敗しました" },
          { status: 500 }
        );
      }

      if (
        !generatedQuestions ||
        !Array.isArray(generatedQuestions.questions) ||
        generatedQuestions.questions.length === 0
      ) {
        console.error("Invalid questions payload:", response);
        return NextResponse.json(
          { error: "質問の生成に失敗しました" },
          { status: 500 }
        );
      }

      // Map generated questions to available AI slots
      const aiQuestionsToInsert = generatedQuestions.questions
        .slice(0, aiSlotsNeeded.length)
        .map((q, i) => ({
          session_id: sessionId,
          question_index: aiSlotsNeeded[i],
          statement: q.statement,
          detail: q.detail,
          options: q.options,
          phase,
          source: "ai" as const,
        }));

      if (aiQuestionsToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from("questions")
          .upsert(aiQuestionsToInsert, {
            onConflict: "session_id,question_index",
            ignoreDuplicates: true,
          })
          .select();

        if (insertError) {
          console.error("Question insert error:", insertError);
          return NextResponse.json(
            { error: "質問の保存に失敗しました" },
            { status: 500 }
          );
        }

        insertedQuestions = [...insertedQuestions, ...((data as QuestionWithAnswer[]) || [])];
      }
    }

    // Update session's current question index
    await supabase
      .from("sessions")
      .update({ current_question_index: endIndex })
      .eq("id", sessionId);

    return NextResponse.json({ questions: insertedQuestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
