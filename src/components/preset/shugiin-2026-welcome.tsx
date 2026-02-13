"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getPreset } from "@/lib/presets";
import { DEFAULT_REPORT_TARGET } from "@/lib/utils/phase";

const PARTIES = [
  { name: "自由民主党", shortName: "自民", color: "#DC2626" },
  { name: "日本維新の会", shortName: "維新", color: "#16A34A" },
  { name: "中道改革連合", shortName: "中道", color: "#2563EB" },
  { name: "国民民主党", shortName: "国民", color: "#CA8A04" },
  { name: "れいわ新選組", shortName: "れいわ", color: "#DB2777" },
  { name: "社会民主党", shortName: "社民", color: "#7C3AED" },
  { name: "日本共産党", shortName: "共産", color: "#B91C1C" },
  { name: "参政党", shortName: "参政", color: "#EA580C" },
  { name: "日本保守党", shortName: "保守", color: "#374151" },
  { name: "チームみらい", shortName: "みらい", color: "#0891B2" },
];

export function Shugiin2026Welcome() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState(DEFAULT_REPORT_TARGET);
  const initStarted = useRef(false);

  // ページ表示時にバックグラウンドでセッション作成＆質問生成
  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    const initSession = async () => {
      try {
        const preset = getPreset("2026-shugiin-election");
        if (!preset) {
          throw new Error("プリセットが見つかりません");
        }

        const presetReportTarget = preset.reportTarget ?? DEFAULT_REPORT_TARGET;
        setReportTarget(presetReportTarget);

        // セッション作成
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: preset.purpose,
            backgroundText: preset.backgroundText,
            title: preset.title,
            reportInstructions: preset.reportInstructions,
            reportTarget: presetReportTarget,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "セッションの作成に失敗しました");
        }

        const { sessionId: newSessionId } = await response.json();
        setSessionId(newSessionId);

        // LocalStorage保存
        const sessions = JSON.parse(
          localStorage.getItem("sonar_sessions") || "[]"
        );
        sessions.unshift({
          id: newSessionId,
          purpose: preset.purpose,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(
          "sonar_sessions",
          JSON.stringify(sessions.slice(0, 20))
        );

        // 質問生成をバックグラウンドで開始（await不要、完了を待たない）
        fetch("/api/questions/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: newSessionId,
            startIndex: 1,
            endIndex: 5,
          }),
        }).catch(console.error);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "予期せぬエラーが発生しました"
        );
      }
    };

    initSession();
  }, []);

  const handleStart = () => {
    if (sessionId) {
      setIsNavigating(true);
      router.push(`/session/${sessionId}`);
    }
  };

  const isReady = sessionId !== null;
  const buttonText = isNavigating
    ? "移動中..."
    : isReady
      ? "はじめる"
      : "準備中...";

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-md mx-auto px-6 py-12 md:py-20">
        {/* タイトル */}
        <header className="mb-8">
          <p className="text-sm text-gray-400 mb-3">2026年 衆議院選挙</p>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-snug">
            あなたの考えに近い
            <br />
            政党を見つける
          </h1>
        </header>

        {/* 基本説明 */}
        <p className="text-gray-600 mb-10">
          政策に関する質問に「はい」「いいえ」などで回答すると、
          各政党のマニフェストと照らし合わせて、相性の良い政党を提案します。
        </p>

        {/* AI動的生成の説明 */}
        <section className="mb-10 py-6 border-y border-gray-100">
          <p className="text-sm text-gray-400 mb-4">このボートマッチの特徴</p>

          <img
            src="/images/votematch-hero.png"
            alt="AIとの対話を通じて考えを深掘りしていくイメージ"
            className="rounded-lg mb-5 w-full"
          />

          <h2 className="font-medium text-gray-900 mb-3">
            AIがあなたの回答を見ながら、次の質問を考えます
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            一般的なボートマッチは全員に同じ質問をしますが、
            ここではAIがあなたの回答パターンを分析しながら、
            より深掘りすべきテーマや、まだ聞けていない観点を見つけて質問を作ります。
            対話を重ねるうちに、自分でも気づいていなかった考えが見えてくるかもしれません。
          </p>
        </section>

        {/* 政党 */}
        <section className="mb-10">
          <p className="text-sm text-gray-400 mb-3">比較対象の10政党</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {PARTIES.map((party) => (
              <span
                key={party.shortName}
                className="text-sm px-2 py-1 rounded"
                style={{
                  backgroundColor: `${party.color}0D`,
                  color: party.color,
                }}
                title={party.name}
              >
                {party.shortName}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            各政党の2026年マニフェスト・政策集に基づいて比較
          </p>
        </section>

        {/* 結果について */}
        <section className="mb-10">
          <p className="text-sm text-gray-400 mb-2">診断結果</p>
          <p className="text-gray-600 text-sm">
            回答が終わると、あなたの価値観の傾向と、
            相性の良い政党をレポートにまとめます。
            なぜその政党と相性が良いのか、具体的な政策を引用しながら解説します。
          </p>
        </section>

        {/* 所要時間 */}
        <section className="mb-10">
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-gray-400 mb-1">所要時間</p>
              <p className="text-gray-700">約10分</p>
            </div>
            <div>
              <p className="text-gray-400 mb-1">質問数</p>
              <p className="text-gray-700">{reportTarget}問</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button
            onClick={handleStart}
            disabled={!isReady || isNavigating}
            className="w-full py-3.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {buttonText}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            回答データは個人を特定しない形式で保存されます
          </p>
        </section>

        {/* ベータ版 disclaimer */}
        <section className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 leading-relaxed">
            本サービスは技術検証が目的のベータ版です。中立性に配慮して作成しておりますが、分析結果の正確性を保証するものではありません。
            ご意見・ご指摘は
            <a
              href="mailto:sa4168@columbia.edu"
              className="text-blue-600 hover:underline"
            >
              こちら
            </a>
            までお寄せください。
          </p>
          <p className="text-xs text-gray-500 mt-2">
            <a
              href="https://github.com/plural-reality/baisoku-survey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              ソースコード
            </a>
            ・
            <a
              href="https://github.com/plural-reality/baisoku-survey/blob/main/src/lib/presets/2026-shugiin-election.json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              プロンプト
            </a>
            を公開しています。開発にお力添えいただける方は、お気軽にお声がけください。
          </p>
        </section>
      </div>
    </main>
  );
}
