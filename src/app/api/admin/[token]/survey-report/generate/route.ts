import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenRouter } from "@/lib/openrouter/client";
import {
  buildSurveyReportPrompt,
  SurveyReportParticipant,
} from "@/lib/openrouter/prompts";
import { z } from "zod";

const generateSchema = z.object({
  customInstructions: z.string().optional(),
});

interface QuestionWithAnswer {
  question_index: number;
  statement: string;
  detail: string | null;
  options: string[];
  answers?: Array<{ selected_option: number; free_text: string | null }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { customInstructions } = generateSchema.parse(body);

    const supabase = await createClient();

    // Verify admin token
    const { data: presetRows, error: presetError } = await supabase.rpc(
      "get_preset_by_admin_token",
      { token }
    );

    if (presetError || !presetRows || presetRows.length === 0) {
      return NextResponse.json(
        { error: "管理画面が見つかりません" },
        { status: 404 }
      );
    }

    const preset = presetRows[0];

    // Fetch full preset info
    const { data: presetFull } = await supabase
      .from("presets")
      .select("purpose, background_text, report_instructions, key_questions, fixed_questions, exploration_themes")
      .eq("id", preset.id)
      .single();

    if (!presetFull) {
      return NextResponse.json(
        { error: "プリセット情報が取得できません" },
        { status: 500 }
      );
    }

    // Fetch all sessions for this preset (ordered by created_at for stable user numbering)
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, status, current_question_index, created_at")
      .eq("preset_id", preset.id)
      .order("created_at", { ascending: true });

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: "回答がまだありません" },
        { status: 400 }
      );
    }

    const sessionIds = sessions.map((s) => s.id);

    // Fetch all questions + answers for all sessions
    const { data: allQuestions } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .in("session_id", sessionIds)
      .order("question_index", { ascending: true });

    // Fetch latest personal reports for each session
    const { data: allReports } = await supabase
      .from("reports")
      .select("session_id, version, report_text")
      .in("session_id", sessionIds)
      .order("version", { ascending: false });

    // Build a map of session_id -> latest report
    const latestReportMap = new Map<string, string>();
    if (allReports) {
      for (const report of allReports) {
        if (!latestReportMap.has(report.session_id)) {
          latestReportMap.set(report.session_id, report.report_text);
        }
      }
    }

    // Build participants array
    const participants: SurveyReportParticipant[] = sessions.map(
      (session, idx) => {
        const sessionQuestions = (
          (allQuestions as QuestionWithAnswer[]) || []
        ).filter(
          (q) =>
            (q as unknown as { session_id: string }).session_id === session.id
        );

        const qa = sessionQuestions
          .filter((q) => q.answers && q.answers.length > 0)
          .map((q) => ({
            index: q.question_index,
            statement: q.statement,
            detail: q.detail || "",
            options: q.options as string[],
            selectedOption: q.answers![0].selected_option,
            freeText: q.answers![0].free_text ?? null,
          }));

        return {
          userNumber: idx + 1,
          sessionId: session.id,
          qa,
          personalReport: latestReportMap.get(session.id) || null,
        };
      }
    );

    // Reject if no participant has any answered questions
    const totalAnswers = participants.reduce((sum, p) => sum + p.qa.length, 0);
    if (totalAnswers === 0) {
      return NextResponse.json(
        { error: "回答データがありません。少なくとも1件の回答が必要です。" },
        { status: 400 }
      );
    }

    // Determine next version
    const { data: existingReports } = await supabase
      .from("survey_reports")
      .select("version")
      .eq("preset_id", preset.id)
      .order("version", { ascending: false })
      .limit(1);

    const newVersion =
      existingReports && existingReports.length > 0
        ? existingReports[0].version + 1
        : 1;

    // Create the report record with 'generating' status
    const { data: reportRecord, error: insertError } = await supabase
      .from("survey_reports")
      .insert({
        preset_id: preset.id,
        version: newVersion,
        report_text: "",
        custom_instructions: customInstructions || null,
        status: "generating",
      })
      .select()
      .single();

    if (insertError || !reportRecord) {
      console.error("Survey report insert error:", insertError);
      return NextResponse.json(
        { error: "レポートレコードの作成に失敗しました" },
        { status: 500 }
      );
    }

    // Build prompt and call LLM
    const explorationThemes = Array.isArray(presetFull.exploration_themes) && (presetFull.exploration_themes as string[]).length > 0
      ? presetFull.exploration_themes as string[]
      : Array.isArray(presetFull.key_questions) ? presetFull.key_questions as string[] : [];
    const fixedQuestions = Array.isArray(presetFull.fixed_questions)
      ? presetFull.fixed_questions as Array<{ statement: string; detail: string }>
      : [];
    const prompt = buildSurveyReportPrompt({
      purpose: presetFull.purpose,
      backgroundText: presetFull.background_text || "",
      reportInstructions: presetFull.report_instructions || undefined,
      explorationThemes: explorationThemes.length > 0 ? explorationThemes : undefined,
      fixedQuestions: fixedQuestions.length > 0 ? fixedQuestions : undefined,
      customInstructions: customInstructions || undefined,
      participants,
    });

    try {
      const reportText = await callOpenRouter(
        [{ role: "user", content: prompt }],
        { temperature: 0.7, maxTokens: 8000, reasoning: { effort: "high" } }
      );

      // Update with completed report
      const { data: updatedReport, error: updateError } = await supabase
        .from("survey_reports")
        .update({ report_text: reportText, status: "completed" })
        .eq("id", reportRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error("Survey report update error:", updateError);
        return NextResponse.json(
          { error: "レポートの保存に失敗しました" },
          { status: 500 }
        );
      }

      return NextResponse.json({ report: updatedReport });
    } catch (llmError) {
      // Mark as failed
      await supabase
        .from("survey_reports")
        .update({ status: "failed" })
        .eq("id", reportRecord.id);

      console.error("LLM generation error:", llmError);
      return NextResponse.json(
        { error: "レポート生成中にエラーが発生しました" },
        { status: 500 }
      );
    }
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
