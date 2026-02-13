import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callOpenRouter } from "@/lib/openrouter/client";
import { buildReportPrompt } from "@/lib/openrouter/prompts";
import { z } from "zod";
import { sendCompletionNotification } from "@/lib/email/resend";

const generateReportSchema = z.object({
  sessionId: z.string().uuid(),
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
  report_instructions: string | null;
  key_questions: string[] | null;
  fixed_questions: Array<{ statement: string; detail: string; options: string[] }> | null;
  exploration_themes: string[] | null;
  status: string;
  preset_id: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = generateReportSchema.parse(body);

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

    // Fetch all questions with answers
    const { data: questions } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .eq("session_id", sessionId)
      .order("question_index", { ascending: true });

    const allQA = ((questions as (QuestionWithAnswer & { source?: string })[]) || [])
      .filter((q) => q.answers && q.answers.length > 0)
      .map((q) => ({
        index: q.question_index,
        statement: q.statement,
        detail: q.detail || "",
        options: q.options as string[],
        selectedOption: q.answers![0].selected_option ?? null,
        freeText: q.answers![0].free_text ?? null,
        source: (q.source === "fixed" ? "fixed" : "ai") as "ai" | "fixed",
        questionType: q.question_type || "radio",
        selectedOptions: (q.answers![0].selected_options as number[] | null) ?? null,
        answerText: q.answers![0].answer_text ?? null,
        scaleConfig: q.scale_config ?? null,
      }));

    if (allQA.length < 5) {
      return NextResponse.json(
        { error: "レポート生成には最低5問の回答が必要です" },
        { status: 400 }
      );
    }

    // Fetch all analyses
    const { data: analysesData } = await supabase
      .from("analyses")
      .select("analysis_text")
      .eq("session_id", sessionId)
      .order("batch_index", { ascending: true });

    const analyses = (analysesData || []) as Array<{ analysis_text: string }>;

    // Get current version
    const { data: existingReports } = await supabase
      .from("reports")
      .select("version")
      .eq("session_id", sessionId)
      .order("version", { ascending: false })
      .limit(1);

    const newVersion =
      existingReports && existingReports.length > 0
        ? existingReports[0].version + 1
        : 1;

    // Generate report
    const explorationThemes = Array.isArray(session.exploration_themes) && session.exploration_themes.length > 0
      ? session.exploration_themes as string[]
      : Array.isArray(session.key_questions) ? session.key_questions as string[] : [];
    const fixedQuestions = Array.isArray(session.fixed_questions) ? session.fixed_questions as Array<{ statement: string; detail: string }> : [];
    const prompt = buildReportPrompt({
      purpose: session.purpose,
      backgroundText: session.background_text || "",
      reportInstructions: session.report_instructions || undefined,
      explorationThemes: explorationThemes.length > 0 ? explorationThemes : undefined,
      fixedQuestions: fixedQuestions.length > 0 ? fixedQuestions : undefined,
      allQA,
      allAnalyses: analyses.map((a) => a.analysis_text),
      version: newVersion,
    });

    const reportText = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 4000 }
    );

    // Save report
    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        session_id: sessionId,
        version: newVersion,
        report_text: reportText,
      })
      .select()
      .single();

    if (error) {
      console.error("Report save error:", error);
      return NextResponse.json(
        { error: "レポートの保存に失敗しました" },
        { status: 500 }
      );
    }

    // Update session status
    await supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);

    // Send email notification (fire-and-forget)
    if (session.preset_id) {
      (async () => {
        try {
          const { data: presetData } = await supabase
            .from("presets")
            .select("notification_email, title, slug")
            .eq("id", session.preset_id!)
            .single();

          if (presetData?.notification_email) {
            const { count } = await supabase
              .from("sessions")
              .select("id", { count: "exact", head: true })
              .eq("preset_id", session.preset_id!)
              .eq("status", "completed");

            await sendCompletionNotification({
              to: presetData.notification_email,
              presetTitle: presetData.title || "無題のアンケート",
              presetSlug: presetData.slug,
              sessionCount: count ?? 1,
            });
          }
        } catch (err) {
          console.error("Email notification error:", err);
        }
      })();
    }

    return NextResponse.json({ report });
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
