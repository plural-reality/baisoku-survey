import { describe, it, expect } from "vitest";

// Extracted from route.ts for testing
function extractJsonPayload(response: string): string | null {
  const fencedMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return response.slice(firstBrace, lastBrace + 1).trim();
}

function normalizeJsonPayload(raw: string): string {
  return raw.replace(/,\s*([}\]])/g, "$1").replace(/}\s*{/g, "},{");
}

describe("extractJsonPayload", () => {
  it("コードブロック内のJSONを抽出する", () => {
    const input = 'Some text\n```json\n{"questions": []}\n```\nMore text';
    expect(extractJsonPayload(input)).toBe('{"questions": []}');
  });

  it("言語指定なしのコードブロックも対応する", () => {
    const input = '```\n{"questions": [{"statement": "test"}]}\n```';
    expect(extractJsonPayload(input)).toBe('{"questions": [{"statement": "test"}]}');
  });

  it("コードブロックがない場合はブレースで抽出する", () => {
    const input = 'Here is the result: {"questions": []}';
    expect(extractJsonPayload(input)).toBe('{"questions": []}');
  });

  it("JSONがない場合はnullを返す", () => {
    expect(extractJsonPayload("No JSON here")).toBeNull();
    expect(extractJsonPayload("")).toBeNull();
  });

  it("ネストされたJSONを正しく抽出する", () => {
    const input = '{"questions": [{"statement": "Q1", "options": ["A", "B"]}]}';
    const result = extractJsonPayload(input);
    expect(result).toBe(input);
    expect(() => JSON.parse(result!)).not.toThrow();
  });
});

describe("normalizeJsonPayload", () => {
  it("末尾カンマを削除する", () => {
    const input = '{"a": 1, "b": 2,}';
    const result = normalizeJsonPayload(input);
    expect(result).toBe('{"a": 1, "b": 2}');
  });

  it("配列末尾のカンマを削除する", () => {
    const input = '{"items": [1, 2, 3,]}';
    const result = normalizeJsonPayload(input);
    expect(result).toBe('{"items": [1, 2, 3]}');
  });

  it("連続するオブジェクトをカンマで繋ぐ", () => {
    const input = '{"a":1}{"b":2}';
    const result = normalizeJsonPayload(input);
    expect(result).toBe('{"a":1},{"b":2}');
  });

  it("正常なJSONはそのまま返す", () => {
    const input = '{"questions": [{"statement": "test"}]}';
    expect(normalizeJsonPayload(input)).toBe(input);
  });
});

describe("LLMレスポンスのパース統合テスト", () => {
  it("典型的なGeminiレスポンスをパースできる", () => {
    const llmResponse = `以下が生成された質問です。

\`\`\`json
{
  "questions": [
    {
      "statement": "リモートワークの頻度は適切だと思いますか？",
      "detail": "現在の週あたりのリモートワーク日数について",
      "options": ["はい", "わからない", "いいえ", "条件付きで賛成", "部分的に不満", "改善の余地がある"]
    },
    {
      "statement": "チーム内のコミュニケーションは十分ですか？",
      "detail": "対面・オンライン含む日常的なやりとりについて",
      "options": ["はい", "わからない", "いいえ", "ツール次第", "頻度が多すぎる", "形式的すぎる"]
    }
  ]
}
\`\`\``;

    const json = extractJsonPayload(llmResponse);
    expect(json).not.toBeNull();
    const parsed = JSON.parse(json!);
    expect(parsed.questions).toHaveLength(2);
    expect(parsed.questions[0].statement).toContain("リモートワーク");
    expect(parsed.questions[0].options).toHaveLength(6);
  });

  it("末尾カンマ付きのレスポンスをパースできる", () => {
    const llmResponse = `{"questions": [{"statement": "Q1", "detail": "", "options": ["A", "B", "C",],},]}`;
    const json = extractJsonPayload(llmResponse);
    expect(json).not.toBeNull();
    const normalized = normalizeJsonPayload(json!);
    expect(() => JSON.parse(normalized)).not.toThrow();
  });
});
