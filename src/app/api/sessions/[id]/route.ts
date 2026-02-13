import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    // Fetch questions
    const { data: questions } = await supabase
      .from("questions")
      .select("*")
      .eq("session_id", sessionId)
      .order("question_index", { ascending: true });

    // Fetch answers
    const { data: answers } = await supabase
      .from("answers")
      .select("*")
      .eq("session_id", sessionId);

    // Fetch analyses
    const { data: analyses } = await supabase
      .from("analyses")
      .select("*")
      .eq("session_id", sessionId)
      .order("batch_index", { ascending: true });

    // Fetch latest report
    const { data: report } = await supabase
      .from("reports")
      .select("*")
      .eq("session_id", sessionId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build answer map
    const answerMap = new Map(
      (answers || []).map((a) => [
        a.question_id,
        {
          selectedOption: a.selected_option ?? null,
          freeText: a.free_text ?? null,
          selectedOptions: a.selected_options ?? null,
          answerText: a.answer_text ?? null,
        },
      ])
    );

    // Combine questions with answers
    const questionsWithAnswers = (questions || []).map((q) => {
      const answer = answerMap.get(q.id) ?? null;
      return {
        ...q,
        selectedOption: answer?.selectedOption ?? null,
        freeText: answer?.freeText ?? null,
        selectedOptions: answer?.selectedOptions ?? null,
        answerText: answer?.answerText ?? null,
      };
    });

    return NextResponse.json({
      session,
      questions: questionsWithAnswers,
      analyses: analyses || [],
      report: report || null,
    });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
