import { describe, it, expect } from "vitest";
import { z } from "zod";

// Re-define schemas here to test validation logic independently of Next.js runtime
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

const createSessionSchema = z.object({
  purpose: z.string().min(1, "目的を入力してください").max(5000),
  backgroundText: z.string().max(50000).optional(),
  title: z.string().max(100).optional(),
  reportInstructions: z.string().max(10000).optional(),
  keyQuestions: z.array(z.string().max(500)).max(20).optional(),
  fixedQuestions: z.array(fixedQuestionSchema).max(50).optional(),
  explorationThemes: z.array(z.string().max(500)).max(20).optional(),
  presetId: z.string().uuid().optional(),
  reportTarget: z.number().int().min(5).refine((v) => v % 5 === 0, {
    message: "回答数は5の倍数で指定してください",
  }).optional(),
});

describe("createSessionSchema", () => {
  it("最小限の有効なリクエストを受け付ける", () => {
    const result = createSessionSchema.safeParse({
      purpose: "テスト目的",
    });
    expect(result.success).toBe(true);
  });

  it("purposeが空の場合は拒否する", () => {
    const result = createSessionSchema.safeParse({
      purpose: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("目的を入力してください");
    }
  });

  it("purposeがない場合は拒否する", () => {
    const result = createSessionSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("reportTargetが5の倍数でない場合は拒否する", () => {
    const result = createSessionSchema.safeParse({
      purpose: "テスト",
      reportTarget: 7,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("回答数は5の倍数で指定してください");
    }
  });

  it("reportTargetが5未満の場合は拒否する", () => {
    const result = createSessionSchema.safeParse({
      purpose: "テスト",
      reportTarget: 3,
    });
    expect(result.success).toBe(false);
  });

  it("reportTarget=25を受け付ける", () => {
    const result = createSessionSchema.safeParse({
      purpose: "テスト",
      reportTarget: 25,
    });
    expect(result.success).toBe(true);
  });

  it("全フィールドを含むリクエストを受け付ける", () => {
    const result = createSessionSchema.safeParse({
      purpose: "社員満足度調査",
      backgroundText: "新しいオフィスに移転してから3ヶ月が経過",
      title: "オフィス移転後アンケート",
      reportInstructions: "部署別の傾向分析を含めてください",
      keyQuestions: ["リモートワークの頻度", "通勤時間の変化"],
      explorationThemes: ["職場環境", "コミュニケーション"],
      reportTarget: 15,
    });
    expect(result.success).toBe(true);
  });

  it("不正なUUIDのpresetIdは拒否する", () => {
    const result = createSessionSchema.safeParse({
      purpose: "テスト",
      presetId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("正しいUUIDのpresetIdを受け付ける", () => {
    const result = createSessionSchema.safeParse({
      purpose: "テスト",
      presetId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

describe("fixedQuestionSchema", () => {
  it("radio型で選択肢2つ以上を受け付ける", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "質問文",
      detail: "詳細",
      options: ["はい", "いいえ"],
      question_type: "radio",
    });
    expect(result.success).toBe(true);
  });

  it("radio型で選択肢1つは拒否する", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "質問文",
      detail: "詳細",
      options: ["はい"],
      question_type: "radio",
    });
    expect(result.success).toBe(false);
  });

  it("text型は選択肢なしでも受け付ける", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "自由記述質問",
      detail: "詳しく教えてください",
      options: [],
      question_type: "text",
    });
    expect(result.success).toBe(true);
  });

  it("textarea型は選択肢なしでも受け付ける", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "長文回答",
      detail: "",
      options: [],
      question_type: "textarea",
    });
    expect(result.success).toBe(true);
  });

  it("scale型でscale_configを受け付ける", () => {
    const result = fixedQuestionSchema.safeParse({
      statement: "満足度",
      detail: "",
      options: ["1", "2", "3", "4", "5"],
      question_type: "scale",
      scale_config: { min: 1, max: 5, minLabel: "不満", maxLabel: "満足" },
    });
    expect(result.success).toBe(true);
  });
});
