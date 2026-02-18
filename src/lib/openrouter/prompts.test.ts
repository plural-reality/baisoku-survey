import { describe, it, expect } from "vitest";

// Re-implement formatAnswerText to test independently
const OTHER_OPTION_INDEX = 6;

function formatAnswerText(
  options: string[],
  selectedOption: number | null | undefined,
  freeText?: string | null,
  questionType?: string,
  selectedOptions?: number[] | null,
  answerText?: string | null,
  scaleConfig?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null
): string {
  const qt = questionType || 'radio';
  if (qt === 'text' || qt === 'textarea') {
    return answerText?.trim() || "未回答";
  }
  if (qt === 'checkbox') {
    if (!selectedOptions || selectedOptions.length === 0) return "未回答";
    return selectedOptions.map(i => options[i] ?? `選択肢${i}`).join(", ");
  }
  if (qt === 'scale') {
    if (selectedOption === null || selectedOption === undefined) return "未回答";
    const label = scaleConfig
      ? `${selectedOption}（${scaleConfig.minLabel || scaleConfig.min} 〜 ${scaleConfig.maxLabel || scaleConfig.max}）`
      : String(selectedOption);
    return label;
  }
  if (selectedOption === null || selectedOption === undefined) {
    return "未回答";
  }
  if (selectedOption === OTHER_OPTION_INDEX) {
    const trimmed = freeText?.trim();
    return trimmed ? `その他（自由記述）: ${trimmed}` : "その他（自由記述）";
  }
  return options[selectedOption] ?? "未回答";
}

describe("formatAnswerText — radio/dropdown", () => {
  const options = ["はい", "わからない", "いいえ", "条件付き", "一部", "改善必要"];

  it("選択肢のテキストを返す", () => {
    expect(formatAnswerText(options, 0)).toBe("はい");
    expect(formatAnswerText(options, 2)).toBe("いいえ");
    expect(formatAnswerText(options, 5)).toBe("改善必要");
  });

  it("未回答(null)の場合「未回答」を返す", () => {
    expect(formatAnswerText(options, null)).toBe("未回答");
    expect(formatAnswerText(options, undefined)).toBe("未回答");
  });

  it("「その他」(index=6)でfreeTextがある場合", () => {
    expect(formatAnswerText(options, 6, "独自の意見")).toBe(
      "その他（自由記述）: 独自の意見"
    );
  });

  it("「その他」(index=6)でfreeTextがない場合", () => {
    expect(formatAnswerText(options, 6, null)).toBe("その他（自由記述）");
    expect(formatAnswerText(options, 6, "")).toBe("その他（自由記述）");
  });

  it("範囲外のインデックスは「未回答」", () => {
    expect(formatAnswerText(options, 10)).toBe("未回答");
  });
});

describe("formatAnswerText — text/textarea", () => {
  it("テキスト回答を返す", () => {
    expect(formatAnswerText([], null, null, "text", null, "回答テキスト")).toBe("回答テキスト");
  });

  it("空テキストは「未回答」", () => {
    expect(formatAnswerText([], null, null, "textarea", null, "")).toBe("未回答");
    expect(formatAnswerText([], null, null, "text", null, null)).toBe("未回答");
  });

  it("前後の空白をtrimする", () => {
    expect(formatAnswerText([], null, null, "text", null, "  回答  ")).toBe("回答");
  });
});

describe("formatAnswerText — checkbox", () => {
  const options = ["A", "B", "C", "D"];

  it("複数選択をカンマ区切りで返す", () => {
    expect(formatAnswerText(options, null, null, "checkbox", [0, 2])).toBe("A, C");
  });

  it("単一選択も対応", () => {
    expect(formatAnswerText(options, null, null, "checkbox", [1])).toBe("B");
  });

  it("空配列は「未回答」", () => {
    expect(formatAnswerText(options, null, null, "checkbox", [])).toBe("未回答");
    expect(formatAnswerText(options, null, null, "checkbox", null)).toBe("未回答");
  });

  it("範囲外インデックスはフォールバックテキスト", () => {
    expect(formatAnswerText(options, null, null, "checkbox", [10])).toBe("選択肢10");
  });
});

describe("formatAnswerText — scale", () => {
  it("scaleConfigありで値とラベルを返す", () => {
    const config = { min: 1, max: 5, minLabel: "不満", maxLabel: "満足" };
    expect(formatAnswerText([], 3, null, "scale", null, null, config)).toBe(
      "3（不満 〜 満足）"
    );
  });

  it("scaleConfigなしで数値のみ返す", () => {
    expect(formatAnswerText([], 4, null, "scale")).toBe("4");
  });

  it("ラベルなしのscaleConfigでmin/max数値を表示", () => {
    const config = { min: 1, max: 10 };
    expect(formatAnswerText([], 7, null, "scale", null, null, config)).toBe(
      "7（1 〜 10）"
    );
  });

  it("未回答は「未回答」", () => {
    expect(formatAnswerText([], null, null, "scale")).toBe("未回答");
  });
});
