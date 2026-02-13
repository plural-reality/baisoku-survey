import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenRouter } from "@/lib/openrouter/client";
import { buildAnalysisPrompt } from "@/lib/openrouter/prompts";
import { z } from "zod";

const generateAnalysisSchema = z.object({
  sessionId: z.string().uuid(),
  batchIndex: z.number().int().min(1),
  startIndex: z.number().int().min(1),
  endIndex: z.number().int().min(1),
});

interface QuestionWithAnswer {
  question_index: number;
  statement: string;
  detail: string | null;
  options: string[];
  question_type?: string;
  scale_config?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
  answers?: Array<{ selected_option: number | null; free_text: string | null; selected_options: number[] | null; answer_text: string | null }>;
}

interface SessionData {
  id: string;
  purpose: string;
  background_text: string | null;
  phase_profile: unknown;
  status: string;
  current_question_index: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, batchIndex, startIndex, endIndex } =
      generateAnalysisSchema.parse(body);

    const supabase = await createClient();

    // Fetch session
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    const session = sessionData as SessionData | null;

    if (!session) {
      return NextResponse.json(
        { error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    // Fetch questions for this batch with answers
    const { data: questions } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .eq("session_id", sessionId)
      .gte("question_index", startIndex)
      .lte("question_index", endIndex)
      .order("question_index", { ascending: true });

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "質問が見つかりません" },
        { status: 404 }
      );
    }

    // Check all questions are answered
    const batchQA = ((questions as QuestionWithAnswer[]) || []).map((q) => ({
      index: q.question_index,
      statement: q.statement,
      detail: q.detail || "",
      options: q.options as string[],
      selectedOption: q.answers?.[0]?.selected_option ?? null,
      freeText: q.answers?.[0]?.free_text ?? null,
      questionType: q.question_type || "radio",
      selectedOptions: (q.answers?.[0]?.selected_options as number[] | null) ?? null,
      answerText: q.answers?.[0]?.answer_text ?? null,
      scaleConfig: q.scale_config ?? null,
    }));

    const hasUnanswered = batchQA.some((q) => {
      const qt = q.questionType || 'radio';
      if (qt === 'text' || qt === 'textarea') return !q.answerText;
      if (qt === 'checkbox') return !q.selectedOptions || q.selectedOptions.length === 0;
      return q.selectedOption === null || q.selectedOption === undefined;
    });
    if (hasUnanswered) {
      return NextResponse.json(
        { error: "すべての質問に回答してください" },
        { status: 400 }
      );
    }

    // Fetch previous analyses
    const { data: previousAnalysesData } = await supabase
      .from("analyses")
      .select("analysis_text")
      .eq("session_id", sessionId)
      .lt("batch_index", batchIndex)
      .order("batch_index", { ascending: true });

    const previousAnalyses = (previousAnalysesData || []) as Array<{
      analysis_text: string;
    }>;

    // Generate analysis
    const prompt = buildAnalysisPrompt({
      purpose: session.purpose,
      backgroundText: session.background_text || "",
      batchQA: batchQA as Array<{
        index: number;
        statement: string;
        detail: string;
        options: string[];
        selectedOption: number;
        freeText?: string | null;
      }>,
      startIndex,
      endIndex,
      previousAnalyses: previousAnalyses.map((a) => a.analysis_text),
    });

    const analysisText = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 1000 }
    );

    // Save analysis
    const { data: analysis, error } = await supabase
      .from("analyses")
      .upsert(
        {
          session_id: sessionId,
          batch_index: batchIndex,
          start_index: startIndex,
          end_index: endIndex,
          analysis_text: analysisText,
        },
        {
          onConflict: "session_id,batch_index",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Analysis save error:", error);
      return NextResponse.json(
        { error: "分析の保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis });
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
