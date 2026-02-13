import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const updatePresetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  purpose: z.string().min(1).max(5000).optional(),
  background_text: z.string().max(50000).nullable().optional(),
  report_instructions: z.string().max(10000).nullable().optional(),
  key_questions: z.array(z.string().max(500)).max(20).optional(),
  exploration_themes: z.array(z.string().max(500)).max(20).optional(),
  fixed_questions: z
    .array(
      z.object({
        statement: z.string().min(1).max(500),
        detail: z.string().max(1000),
        options: z.array(z.string().max(200)).max(10).default([]),
        question_type: z.enum(['radio', 'checkbox', 'dropdown', 'text', 'textarea', 'scale']).default('radio'),
        scale_config: z.object({
          min: z.number().int(),
          max: z.number().int(),
          minLabel: z.string().max(50).optional(),
          maxLabel: z.string().max(50).optional(),
        }).nullable().optional(),
      }).refine((q) => {
        if (q.question_type === 'text' || q.question_type === 'textarea') return true;
        return q.options.length >= 2;
      }, { message: "選択肢は2つ以上必要です" })
    )
    .max(50)
    .optional(),
  report_target: z
    .number()
    .int()
    .min(5)
    .refine((v) => v % 5 === 0, { message: "回答数は5の倍数で指定してください" })
    .optional(),
  notification_email: z.string().email().nullable().optional(),
});

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
      selected_option: number | null;
      options: string[];
      free_text: string | null;
      source: string;
      question_type: string;
      scale_config: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
      selected_options: number[] | null;
      answer_text: string | null;
    }> = [];

    if (sessionIds.length > 0) {
      const { data: answersData, error: answersError } = await supabase
        .from("answers")
        .select(`
          session_id,
          selected_option,
          free_text,
          selected_options,
          answer_text,
          question:questions!question_id (
            question_index,
            statement,
            options,
            source,
            question_type,
            scale_config
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
            selected_option: (a.selected_option as number | null) ?? null,
            options: (question?.options as string[]) ?? [],
            free_text: a.free_text as string | null,
            source: (question?.source as string) ?? "ai",
            question_type: (question?.question_type as string) ?? "radio",
            scale_config: (question?.scale_config as { min: number; max: number; minLabel?: string; maxLabel?: string } | null) ?? null,
            selected_options: (a.selected_options as number[] | null) ?? null,
            answer_text: (a.answer_text as string | null) ?? null,
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

    // Fetch survey (aggregate) reports for this preset
    const { data: surveyReportsData } = await supabase
      .from("survey_reports")
      .select("id, preset_id, version, report_text, custom_instructions, status, created_at")
      .eq("preset_id", preset.id)
      .order("version", { ascending: false });

    return NextResponse.json({
      preset,
      sessions: sessions || [],
      responses,
      reports,
      surveyReports: surveyReportsData || [],
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "予期せぬエラーが発生しました" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

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
    const body = await request.json();
    const validated = updatePresetSchema.parse(body);

    const updateObj: Record<string, unknown> = {};
    if (validated.title !== undefined) updateObj.title = validated.title;
    if (validated.purpose !== undefined) updateObj.purpose = validated.purpose;
    if (validated.background_text !== undefined)
      updateObj.background_text = validated.background_text;
    if (validated.report_instructions !== undefined)
      updateObj.report_instructions = validated.report_instructions;
    if (validated.key_questions !== undefined)
      updateObj.key_questions = validated.key_questions;
    if (validated.exploration_themes !== undefined)
      updateObj.exploration_themes = validated.exploration_themes;
    if (validated.fixed_questions !== undefined)
      updateObj.fixed_questions = validated.fixed_questions;
    if (validated.report_target !== undefined)
      updateObj.report_target = validated.report_target;
    if (validated.notification_email !== undefined)
      updateObj.notification_email = validated.notification_email;

    if (Object.keys(updateObj).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error: updateError } = await supabase
      .from("presets")
      .update(updateObj)
      .eq("id", preset.id);

    if (updateError) {
      console.error("Preset update error:", updateError);
      return NextResponse.json(
        { error: "更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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
