import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Look up preset by admin_token via SECURITY DEFINER function
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

    // Fetch all sessions for this preset
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, title, status, current_question_index, created_at")
      .eq("preset_id", preset.id)
      .order("created_at", { ascending: false });

    if (sessionsError) {
      console.error("Sessions fetch error:", sessionsError);
      return NextResponse.json(
        { error: "セッション一覧の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Fetch answers with questions for all sessions
    const sessionIds = (sessions || []).map((s) => s.id);
    let responses: Array<{
      session_id: string;
      question_index: number;
      statement: string;
      selected_option: number;
      options: string[];
      free_text: string | null;
    }> = [];

    if (sessionIds.length > 0) {
      const { data: answersData, error: answersError } = await supabase
        .from("answers")
        .select(`
          session_id,
          selected_option,
          free_text,
          question:questions!question_id (
            question_index,
            statement,
            options
          )
        `)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      if (!answersError && answersData) {
        responses = answersData.map((a: Record<string, unknown>) => {
          const question = a.question as Record<string, unknown> | null;
          return {
            session_id: a.session_id as string,
            question_index: (question?.question_index as number) ?? 0,
            statement: (question?.statement as string) ?? "",
            selected_option: a.selected_option as number,
            options: (question?.options as string[]) ?? [],
            free_text: a.free_text as string | null,
          };
        });
      }
    }

    // Fetch reports for all sessions
    let reports: Array<{ session_id: string; report_text: string }> = [];
    if (sessionIds.length > 0) {
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("session_id, report_text")
        .in("session_id", sessionIds);

      if (!reportsError && reportsData) {
        reports = reportsData;
      }
    }

    return NextResponse.json({
      preset,
      sessions: sessions || [],
      responses,
      reports,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
