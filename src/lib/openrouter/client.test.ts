import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Must import after mocking
import { callOpenRouter } from "./client";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3939";
});

describe("callOpenRouter", () => {
  it("正常なレスポンスからcontentを返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "生成されたテキスト" } }],
        }),
    });

    const result = await callOpenRouter([
      { role: "user", content: "テスト" },
    ]);
    expect(result).toBe("生成されたテキスト");
  });

  it("正しいモデルとヘッダーでリクエストする", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "" } }],
        }),
    });

    await callOpenRouter([{ role: "user", content: "test" }]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "X-Title": "Baisoku Survey",
          "HTTP-Referer": "http://localhost:3939",
        }),
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("google/gemini-3-flash-preview");
  });

  it("temperatureオプションを反映する", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "" } }],
        }),
    });

    await callOpenRouter(
      [{ role: "user", content: "test" }],
      { temperature: 0.3 }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.3);
  });

  it("maxTokensが指定された場合のみmax_tokensを含む", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "" } }],
        }),
    });

    await callOpenRouter(
      [{ role: "user", content: "test" }],
      { maxTokens: 1000 }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(1000);
  });

  it("reasoningオプションを反映する", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "" } }],
        }),
    });

    await callOpenRouter(
      [{ role: "user", content: "test" }],
      { reasoning: { effort: "high" } }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.reasoning).toEqual({ effort: "high" });
  });

  it("APIエラー時にthrowする", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve("Rate limit exceeded"),
    });

    await expect(
      callOpenRouter([{ role: "user", content: "test" }])
    ).rejects.toThrow("OpenRouter API error: Rate limit exceeded");
  });

  it("choicesが空の場合は空文字を返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: undefined } }],
        }),
    });

    const result = await callOpenRouter([
      { role: "user", content: "test" },
    ]);
    expect(result).toBe("");
  });

  it("デフォルトtemperatureは0.7", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "" } }],
        }),
    });

    await callOpenRouter([{ role: "user", content: "test" }]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.7);
  });
});
