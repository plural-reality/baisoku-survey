"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SessionPreset } from "@/lib/presets";

interface PresetSessionStarterProps {
  preset: SessionPreset;
}

export function PresetSessionStarter({ preset }: PresetSessionStarterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const startSession = async () => {
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: preset.purpose,
            backgroundText: preset.backgroundText,
            title: preset.title,
            reportInstructions: preset.reportInstructions,
            keyQuestions: preset.keyQuestions,
            fixedQuestions: preset.fixedQuestions,
            explorationThemes: preset.explorationThemes,
            presetId: preset.id,
            reportTarget: preset.reportTarget,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "セッションの作成に失敗しました");
        }

        const { sessionId } = await response.json();

        const sessions = JSON.parse(
          localStorage.getItem("sonar_sessions") || "[]"
        );
        sessions.unshift({
          id: sessionId,
          purpose: preset.purpose,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(
          "sonar_sessions",
          JSON.stringify(sessions.slice(0, 20))
        );

        const mode = searchParams.get("mode");
        const query = mode ? `?mode=${encodeURIComponent(mode)}` : "";
        router.replace(`/session/${sessionId}${query}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "予期せぬエラーが発生しました"
        );
      }
    };

    startSession();
  }, [preset, router, searchParams]);

  if (!error) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-medium text-gray-900">{preset.title}</h1>
        <p className="text-sm text-gray-600 mt-1">{preset.purpose}</p>
      </div>
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        {error}
      </div>
    </div>
  );
}
