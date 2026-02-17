import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const createInviteLinkSchema = z.object({
  label: z.string().max(200).default(""),
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
});

// POST: Create a new invite link
export async function POST(request: NextRequest) {
  try {
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
    const validated = createInviteLinkSchema.parse(body);

    const { data, error } = await supabase
      .from("invite_links")
      .insert({
        label: validated.label,
        created_by: user.id,
        expires_at: validated.expiresAt ?? null,
        max_uses: validated.maxUses ?? null,
      })
      .select("id, token, label, expires_at, max_uses, use_count, is_active, created_at")
      .single();

    if (error) {
      console.error("Invite link creation error:", error);
      return NextResponse.json(
        { error: "招待リンクの作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ inviteLink: data });
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

// GET: List current user's invite links
export async function GET() {
  try {
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

    const { data, error } = await supabase
      .from("invite_links")
      .select("id, token, label, expires_at, max_uses, use_count, is_active, created_at")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Invite link list error:", error);
      return NextResponse.json(
        { error: "招待リンクの取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ inviteLinks: data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
