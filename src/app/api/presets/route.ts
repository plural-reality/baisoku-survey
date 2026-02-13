import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomBytes } from "crypto";

const scaleConfigSchema = z.object({
  min: z.number().int(),
  max: z.number().int(),
  minLabel: z.string().max(50).optional(),
  maxLabel: z.string().max(50).optional(),
});

const fixedQuestionSchema = z.object({
  statement: z.string().min(1).max(500),
  detail: z.string().max(1000),
  options: z.array(z.string().max(200)).max(10).default([]),
  question_type: z.enum(['radio', 'checkbox', 'dropdown', 'text', 'textarea', 'scale']).default('radio'),
  scale_config: scaleConfigSchema.nullable().optional(),
}).refine((q) => {
  if (q.question_type === 'text' || q.question_type === 'textarea') return true;
  return q.options.length >= 2;
}, { message: "選択肢は2つ以上必要です" });

const createPresetSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(200),
  purpose: z.string().min(1, "目的を入力してください").max(5000),
  backgroundText: z.string().max(50000).optional(),
  reportInstructions: z.string().max(10000).optional(),
  keyQuestions: z.array(z.string().max(500)).max(20).optional(),
  fixedQuestions: z.array(fixedQuestionSchema).max(50).optional(),
  explorationThemes: z.array(z.string().max(500)).max(20).optional(),
  reportTarget: z.number().int().min(5).refine((v) => v % 5 === 0, {
    message: "回答数は5の倍数で指定してください",
  }).optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(500).optional(),
});

function generateSlug(): string {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createPresetSchema.parse(body);

    const supabase = await createClient();

    // Get current user (may be null for unauthenticated users)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Backward compat: if only keyQuestions provided, use as explorationThemes
    const explorationThemes = validated.explorationThemes
      ?? (validated.keyQuestions && validated.keyQuestions.length > 0 ? validated.keyQuestions : []);

    // Build RPC params — only include p_user_id if user is authenticated
    // This ensures backward compatibility before migration 012 is applied
    const rpcParams: Record<string, unknown> = {
      p_slug: generateSlug(),
      p_title: validated.title,
      p_purpose: validated.purpose,
      p_background_text: validated.backgroundText || null,
      p_report_instructions: validated.reportInstructions || null,
      p_og_title: validated.ogTitle || null,
      p_og_description: validated.ogDescription || null,
      p_key_questions: validated.keyQuestions || [],
      p_report_target: validated.reportTarget || 25,
      p_fixed_questions: validated.fixedQuestions || [],
      p_exploration_themes: explorationThemes,
    };

    // Try with p_user_id first, fall back without it if function doesn't support it yet
    let { data, error } = await supabase.rpc("create_preset_with_token", {
      ...rpcParams,
      p_user_id: user?.id || null,
    });

    if (error?.code === "PGRST202") {
      // Function doesn't have p_user_id param yet — call without it
      ({ data, error } = await supabase.rpc("create_preset_with_token", rpcParams));
    }

    if (error || !data || data.length === 0) {
      console.error("Preset creation error:", error);
      return NextResponse.json(
        { error: "プリセットの作成に失敗しました" },
        { status: 500 }
      );
    }

    const row = data[0];
    return NextResponse.json({
      preset: {
        slug: row.slug,
        adminToken: row.admin_token,
      },
    });
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
