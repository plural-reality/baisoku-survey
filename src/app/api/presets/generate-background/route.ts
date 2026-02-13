import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter/client";
import { z } from "zod";

const generateBackgroundSchema = z.object({
  title: z.string().max(200).optional(),
  purpose: z.string().min(1, "目的を入力してください").max(5000),
});

function buildBackgroundPrompt(purpose: string, title?: string): string {
  return `あなたはアンケート設計の専門家です。
ユーザーが設定した「目的」をもとに、アンケート回答者に共有すべき背景情報を生成してください。

${title ? `## タイトル\n${title}\n` : ""}
## ユーザーの目的
${purpose}

## 背景情報の設計指針

### 内容
- アンケートのテーマについて、回答者が前提として知っておくべき情報をまとめてください
- 客観的な事実・状況説明を中心にし、特定の立場に誘導しないでください
- 回答者が「なぜこのアンケートが行われているか」を理解できる程度の情報量にしてください

### 形式
- 200〜400文字程度
- 箇条書きではなく、読みやすい文章形式
- 専門用語は避け、一般的な言葉で記述

## 出力形式
以下のJSON形式のみで出力してください。説明文は不要です。

{
  "backgroundText": "生成された背景情報テキスト"
}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = generateBackgroundSchema.parse(body);

    const prompt = buildBackgroundPrompt(
      validated.purpose,
      validated.title
    );

    const response = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { temperature: 0.7, maxTokens: 1000 }
    );

    let parsed: { backgroundText: string };
    try {
      const fencedMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const jsonStr = fencedMatch?.[1]?.trim() || response.trim();

      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("No JSON found");
      }

      parsed = JSON.parse(jsonStr.slice(firstBrace, lastBrace + 1));
    } catch (parseError) {
      console.error("Background text JSON parse error:", parseError, response);
      return NextResponse.json(
        { error: "背景情報の生成に失敗しました" },
        { status: 500 }
      );
    }

    if (!parsed || typeof parsed.backgroundText !== "string" || !parsed.backgroundText.trim()) {
      console.error("Invalid background text payload:", response);
      return NextResponse.json(
        { error: "背景情報の生成に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ backgroundText: parsed.backgroundText });
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
