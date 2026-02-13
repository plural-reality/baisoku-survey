const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: {
    temperature?: number;
    maxTokens?: number;
    reasoning?: { effort: "low" | "medium" | "high" };
  } = {}
): Promise<string> {
  const payload: Record<string, unknown> = {
    model: "google/gemini-3-flash-preview",
    messages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.maxTokens !== undefined) {
    payload.max_tokens = options.maxTokens;
  }

  if (options.reasoning) {
    payload.reasoning = options.reasoning;
  }

  console.log("[openrouter] request", JSON.stringify(payload));

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Baisoku Survey",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices[0]?.message?.content || "";
  console.log("[openrouter] response", JSON.stringify({ content }));
  return content;
}
