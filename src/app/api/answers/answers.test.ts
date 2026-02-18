import { describe, it, expect } from "vitest";
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
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "選択肢を選んでください" });
      }
      if (data.selectedOption === FREE_TEXT_OPTION_INDEX && !data.freeText) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "自由記述の内容を入力してください" });
      }
    } else if (qt === 'checkbox') {
      if (!data.selectedOptions || data.selectedOptions.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "少なくとも1つ選択してください" });
      }
    } else if (qt === 'text' || qt === 'textarea') {
      if (!data.answerText || !data.answerText.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "回答を入力してください" });
      }
    }
  });

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const validUuid2 = "660e8400-e29b-41d4-a716-446655440000";

describe("saveAnswerSchema — radio", () => {
  it("通常のラジオ回答を受け付ける", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      selectedOption: 0,
    });
    expect(result.success).toBe(true);
  });

  it("selectedOptionがないradio回答は拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      questionType: "radio",
    });
    expect(result.success).toBe(false);
  });

  it("自由記述(option=6)でfreeTextがない場合は拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      selectedOption: 6,
    });
    expect(result.success).toBe(false);
  });

  it("自由記述(option=6)でfreeTextがある場合は受け付ける", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      selectedOption: 6,
      freeText: "独自の意見です",
    });
    expect(result.success).toBe(true);
  });

  it("selectedOption=7は範囲外で拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      selectedOption: 7,
    });
    expect(result.success).toBe(false);
  });
});

describe("saveAnswerSchema — checkbox", () => {
  it("複数選択を受け付ける", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      questionType: "checkbox",
      selectedOptions: [0, 2, 4],
    });
    expect(result.success).toBe(true);
  });

  it("空の選択は拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      questionType: "checkbox",
      selectedOptions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("saveAnswerSchema — text/textarea", () => {
  it("テキスト回答を受け付ける", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      questionType: "text",
      answerText: "自由回答テキスト",
    });
    expect(result.success).toBe(true);
  });

  it("空のテキスト回答は拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      questionType: "textarea",
      answerText: "",
    });
    expect(result.success).toBe(false);
  });

  it("空白だけのテキスト回答は拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: validUuid2,
      questionType: "text",
      answerText: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("saveAnswerSchema — UUID検証", () => {
  it("不正なsessionIdは拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: "not-uuid",
      questionId: validUuid2,
      selectedOption: 0,
    });
    expect(result.success).toBe(false);
  });

  it("不正なquestionIdは拒否", () => {
    const result = saveAnswerSchema.safeParse({
      sessionId: validUuid,
      questionId: "abc",
      selectedOption: 0,
    });
    expect(result.success).toBe(false);
  });
});
