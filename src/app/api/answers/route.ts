import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const FREE_TEXT_OPTION_INDEX = 6;

const saveAnswerSchema = z
  .object({
    sessionId: z.string().uuid(),
    questionId: z.string().uuid(),
    questionType: z.enum(['radio', 'checkbox', 'dropdown', 'text', 'textarea', 'scale']).optional().default('radio'),
    selectedOption: z.number().int().min(0).max(6).optional().nullable(),
    freeText: z.string().trim().max(1000).optional().nullable(),
    selectedOptions: z.array(z.number().int().min(0)).optional().nullable(),
    answerText: z.string().trim().max(5000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const qt = data.questionType ?? 'radio';

    if (qt === 'radio' || qt === 'dropdown' || qt === 'scale') {
      if (data.selectedOption === null || data.selectedOption === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "選択肢を選んでください",
        });
      }
      if (data.selectedOption === FREE_TEXT_OPTION_INDEX && !data.freeText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "自由記述の内容を入力してください",
        });
      }
    } else if (qt === 'checkbox') {
      if (!data.selectedOptions || data.selectedOptions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "少なくとも1つ選択してください",
        });
      }
    } else if (qt === 'text' || qt === 'textarea') {
      if (!data.answerText || !data.answerText.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "回答を入力してください",
        });
      }
    }
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionId, questionType, selectedOption, freeText, selectedOptions, answerText } =
      saveAnswerSchema.parse(body);

    const supabase = await createClient();
    const qt = questionType ?? 'radio';

    // Build upsert data based on question type
    const upsertData: Record<string, unknown> = {
      session_id: sessionId,
      question_id: questionId,
    };

    if (qt === 'radio' || qt === 'dropdown' || qt === 'scale') {
      upsertData.selected_option = selectedOption;
      upsertData.free_text = selectedOption === FREE_TEXT_OPTION_INDEX ? freeText ?? null : null;
      upsertData.selected_options = null;
      upsertData.answer_text = null;
    } else if (qt === 'checkbox') {
      upsertData.selected_option = null;
      upsertData.free_text = null;
      upsertData.selected_options = selectedOptions;
      upsertData.answer_text = null;
    } else if (qt === 'text' || qt === 'textarea') {
      upsertData.selected_option = null;
      upsertData.free_text = null;
      upsertData.selected_options = null;
      upsertData.answer_text = answerText;
    }

    // Upsert answer (allows updating)
    const { data, error } = await supabase
      .from("answers")
      .upsert(upsertData, {
        onConflict: "session_id,question_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Answer save error:", error);
      return NextResponse.json(
        { error: "回答の保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ answer: data });
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
