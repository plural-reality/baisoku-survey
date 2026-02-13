import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Look up preset by admin_token
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

    // Delete all sessions for this preset (CASCADE deletes questions, answers, analyses, reports)
    const { error: sessionsError } = await supabase
      .from("sessions")
      .delete()
      .eq("preset_id", preset.id);

    if (sessionsError) {
      console.error("Sessions delete error:", sessionsError);
      return NextResponse.json(
        { error: "回答の削除に失敗しました" },
        { status: 500 }
      );
    }

    // Delete survey_reports separately (not cascaded from sessions)
    const { error: surveyError } = await supabase
      .from("survey_reports")
      .delete()
      .eq("preset_id", preset.id);

    if (surveyError) {
      console.error("Survey reports delete error:", surveyError);
      // Non-fatal: sessions already deleted
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
