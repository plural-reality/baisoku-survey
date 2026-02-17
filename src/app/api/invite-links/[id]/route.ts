import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PATCH: Deactivate/reactivate an invite link
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.is_active === "boolean") {
      updateData.is_active = body.is_active;
    }
    if (typeof body.label === "string") {
      updateData.label = body.label;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "更新するフィールドがありません" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("invite_links")
      .update(updateData)
      .eq("id", id)
      .eq("created_by", user.id)
      .select("id, token, label, expires_at, max_uses, use_count, is_active, created_at")
      .single();

    if (error) {
      console.error("Invite link update error:", error);
      return NextResponse.json(
        { error: "招待リンクの更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ inviteLink: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an invite link
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from("invite_links")
      .delete()
      .eq("id", id)
      .eq("created_by", user.id);

    if (error) {
      console.error("Invite link delete error:", error);
      return NextResponse.json(
        { error: "招待リンクの削除に失敗しました" },
        { status: 500 }
      );
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
