import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generatePhaseProfile, DEFAULT_REPORT_TARGET } from "@/lib/utils/phase";

const createSessionSchema = z.object({
  purpose: z.string().min(1, "目的を入力してください").max(5000),
  backgroundText: z.string().max(50000).optional(),
  title: z.string().max(100).optional(),
  reportInstructions: z.string().max(10000).optional(),
  presetId: z.string().uuid().optional(),
  reportTarget: z.number().int().min(5).refine((v) => v % 5 === 0, {
    message: "回答数は5の倍数で指定してください",
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createSessionSchema.parse(body);

    const supabase = await createClient();

    const reportTarget = validated.reportTarget || DEFAULT_REPORT_TARGET;

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        purpose: validated.purpose,
        background_text: validated.backgroundText || null,
        report_instructions: validated.reportInstructions || null,
        title: validated.title || validated.purpose.slice(0, 50),
        phase_profile: generatePhaseProfile(reportTarget),
        report_target: reportTarget,
        status: "active",
        current_question_index: 0,
        preset_id: validated.presetId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Session creation error:", error);
      return NextResponse.json(
        { error: "セッションの作成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessionId: data.id });
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

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("id, title, purpose, status, current_question_index, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Sessions fetch error:", error);
      return NextResponse.json(
        { error: "セッション一覧の取得に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}
