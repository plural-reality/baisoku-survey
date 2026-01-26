import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const FREE_TEXT_OPTION_INDEX = 6;

const saveAnswerSchema = z
  .object({
    sessionId: z.string().uuid(),
    questionId: z.string().uuid(),
    selectedOption: z.number().int().min(0).max(6),
    freeText: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.selectedOption === FREE_TEXT_OPTION_INDEX && !data.freeText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "自由記述の内容を入力してください",
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionId, selectedOption, freeText } =
      saveAnswerSchema.parse(body);

    const supabase = await createClient();
    const normalizedFreeText = selectedOption === FREE_TEXT_OPTION_INDEX ? freeText ?? null : null;

    // Upsert answer (allows updating)
    const { data, error } = await supabase
      .from("answers")
      .upsert(
        {
          session_id: sessionId,
          question_id: questionId,
          selected_option: selectedOption,
          free_text: normalizedFreeText,
        },
        {
          onConflict: "session_id,question_id",
        }
      )
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
