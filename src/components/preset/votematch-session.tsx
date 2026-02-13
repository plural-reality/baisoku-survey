"use client";

import { useState, useEffect } from "react";
import { QuestionFlow } from "@/components/question/question-flow";
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
  { name: "日本保守党", shortName: "保守", color: "#0A82DC" },
  { name: "チームみらい", shortName: "みらい", color: "#10B981" },
];

interface VotematchSessionProps {
  sessionId: string;
}

export function VotematchSession({ sessionId }: VotematchSessionProps) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [reportTarget, setReportTarget] = useState(DEFAULT_REPORT_TARGET);
  const [warmupStatus, setWarmupStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");

  // localStorageでこのセッションがウェルカムを見たか確認
  useEffect(() => {
    const key = `votematch_started_${sessionId}`;
    if (localStorage.getItem(key) === "true") {
      setShowWelcome(false);
    }
  }, [sessionId]);

  // セッション表示時点で質問生成を先行開始
  useEffect(() => {
    let cancelled = false;

    async function warmupQuestions() {
      setWarmupStatus("running");
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          if (!cancelled) {
            setWarmupStatus("error");
          }
          return;
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        if (data?.session?.report_target) {
          setReportTarget(data.session.report_target);
        }

        const existingQuestions = Array.isArray(data?.questions)
          ? data.questions
          : [];

        if (existingQuestions.length > 0) {
          if (!cancelled) {
            setWarmupStatus("done");
          }
          return;
        }

        const generateResponse = await fetch("/api/questions/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, startIndex: 1, endIndex: 5 }),
        });

        if (!cancelled) {
          setWarmupStatus(generateResponse.ok ? "done" : "error");
        }
      } catch {
        if (!cancelled) {
          setWarmupStatus("error");
        }
      }
    }

    warmupQuestions();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handleStart = () => {
    const key = `votematch_started_${sessionId}`;
    localStorage.setItem(key, "true");
    setShowWelcome(false);
  };

  if (!showWelcome) {
    return (
      <QuestionFlow
        sessionId={sessionId}
        autoGenerate={false}
        warmupStatus={warmupStatus}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto pt-6">
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
            <p className="text-gray-700">約15分</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">質問数</p>
            <p className="text-gray-700">{reportTarget}問</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <button
          onClick={handleStart}
          className="w-full py-3.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          はじめる
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
  );
}
