"use client";

import { useState, useCallback, useRef } from "react";
import { PdfUpload } from "@/components/session/pdf-upload";

interface CreatedPreset {
  slug: string;
  adminToken: string;
}

export function PresetCreator() {
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [backgroundText, setBackgroundText] = useState("");
  const [reportInstructions, setReportInstructions] = useState("");
  const [keyQuestions, setKeyQuestions] = useState<string[]>([]);
  const [isGeneratingKeyQuestions, setIsGeneratingKeyQuestions] = useState(false);
  const [reportTarget, setReportTarget] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPreset | null>(null);

  const generateKeyQuestions = useCallback(async () => {
    if (!purpose.trim()) return;

    setIsGeneratingKeyQuestions(true);
    setError(null);

    try {
      const response = await fetch("/api/presets/generate-key-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          backgroundText: backgroundText || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || "項目の生成に失敗しました"
        );
      }

      const { keyQuestions: generated } = await response.json();
      setKeyQuestions(generated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsGeneratingKeyQuestions(false);
    }
  }, [purpose, backgroundText]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const updateKeyQuestion = (index: number, value: string) => {
    setKeyQuestions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removeKeyQuestion = (index: number) => {
    setKeyQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const addKeyQuestion = () => {
    setKeyQuestions((prev) => [...prev, ""]);
  };

  const moveKeyQuestion = (from: number, to: number) => {
    if (from === to) return;
    setKeyQuestions((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
  };

  const handlePdfExtract = (text: string) => {
    setBackgroundText((prev) => prev + "\n\n--- PDF Content ---\n" + text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const filteredKeyQuestions = keyQuestions.filter((q) => q.trim());

      const response = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          purpose,
          backgroundText: backgroundText || undefined,
          reportInstructions: reportInstructions || undefined,
          keyQuestions:
            filteredKeyQuestions.length > 0 ? filteredKeyQuestions : undefined,
          reportTarget,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "アンケートの作成に失敗しました");
      }

      const { preset } = await response.json();
      setCreated(preset);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    const baseUrl = window.location.origin;
    const surveyUrl = `${baseUrl}/preset/${created.slug}`;
    const adminUrl = `${baseUrl}/admin/${created.adminToken}`;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            アンケートを作成しました
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              回答用URL（共有用）
            </label>
            <p className="text-xs text-gray-500 mb-2">
              このURLを回答者に共有してください
            </p>
            <CopyableUrl url={surveyUrl} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              管理画面URL
            </label>
            <p className="text-xs text-gray-500 mb-2">
              回答一覧を確認できます。このURLは管理者のみに共有してください。
            </p>
            <CopyableUrl url={adminUrl} />
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
          管理画面URLは再表示できません。必ず保存してください。
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          タイトル
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：新サービスのコンセプトについて"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label
          htmlFor="purpose"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          質問の目的・テーマ
        </label>
        <p className="text-xs text-gray-500 mb-2">
          回答者にどのようなテーマについて考えてほしいかを記述してください。AIがこの目的に沿って質問を生成します。
        </p>
        <textarea
          id="purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="例：新しく開発中のサービスのコンセプトに対する率直な意見を聞きたい。特に、ターゲットユーザーの課題解決に本当に役立つかを確認したい。"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
          required
        />
      </div>

      <div>
        <label
          htmlFor="background"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          背景情報（任意）
        </label>
        <p className="text-xs text-gray-500 mb-2">
          回答者に前提として知っておいてほしい情報、参考資料の内容などを入力してください。
        </p>
        <textarea
          id="background"
          value={backgroundText}
          onChange={(e) => setBackgroundText(e.target.value)}
          placeholder="例：サービスの概要、ターゲットユーザー、競合との違いなど"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={6}
        />
      </div>

      <PdfUpload onExtract={handlePdfExtract} />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            具体的に聞きたい項目（任意）
          </label>
          <button
            type="button"
            onClick={generateKeyQuestions}
            disabled={isGeneratingKeyQuestions || !purpose.trim()}
            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingKeyQuestions ? "生成中..." : "AIで生成する"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          アンケートで掘り下げたいポイントを設定できます。ここで設定した項目を軸に、AIが具体的な質問を生成します。「AIで生成する」ボタンで目的・背景情報から自動生成することも、手動で追加・編集することもできます。
        </p>

        {keyQuestions.length > 0 && (
          <div className="space-y-1 mb-3">
            {keyQuestions.map((question, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => {
                  setDragIndex(index);
                  dragCounter.current = 0;
                }}
                onDragEnd={() => {
                  if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                    moveKeyQuestion(dragIndex, dragOverIndex);
                  }
                  setDragIndex(null);
                  setDragOverIndex(null);
                  dragCounter.current = 0;
                }}
                onDragEnter={() => {
                  dragCounter.current++;
                  setDragOverIndex(index);
                }}
                onDragLeave={() => {
                  dragCounter.current--;
                  if (dragCounter.current === 0) {
                    setDragOverIndex((prev) => (prev === index ? null : prev));
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                className={`flex gap-1.5 items-start rounded-lg transition-colors ${
                  dragIndex === index
                    ? "opacity-40"
                    : dragOverIndex === index && dragIndex !== null
                      ? "bg-blue-50 ring-1 ring-blue-200"
                      : ""
                }`}
              >
                <div
                  className="mt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                  title="ドラッグで並び替え"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>
                <span className="text-xs text-gray-400 mt-3 min-w-[1.25rem] text-right">
                  {index + 1}.
                </span>
                <textarea
                  value={question}
                  onChange={(e) => updateKeyQuestion(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={3}
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                  placeholder="聞きたい項目を入力..."
                />
                <button
                  type="button"
                  onClick={() => removeKeyQuestion(index)}
                  className="mt-2 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  title="削除"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addKeyQuestion}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          + 項目を追加
        </button>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          詳細設定
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="reportInstructions"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              回答後レポートの生成指示（任意）
            </label>
            <p className="text-xs text-gray-500 mb-2">
              回答者が全問回答した後に表示されるレポートの内容やフォーマットに関する指示があれば入力してください。
            </p>
            <textarea
              id="reportInstructions"
              value={reportInstructions}
              onChange={(e) => setReportInstructions(e.target.value)}
              placeholder="例：回答者の全体的な傾向と、賛否が分かれたポイントをまとめてほしい"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          <div>
            <label
              htmlFor="reportTarget"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              回答数
            </label>
            <p className="text-xs text-gray-500 mb-2">
              何問回答したらレポートを生成するかを設定します。5の倍数で指定できます。
            </p>
            <select
              id="reportTarget"
              value={reportTarget}
              onChange={(e) => setReportTarget(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {Array.from({ length: 19 }, (_, i) => (i + 1) * 5).map((n) => (
                <option key={n} value={n}>
                  {n}問{n === 25 ? "（デフォルト）" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !title.trim() || !purpose.trim()}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "作成中..." : "アンケートを作成する"}
      </button>
    </form>
  );
}

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      const input = document.querySelector<HTMLInputElement>(
        `input[value="${url}"]`
      );
      input?.select();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={url}
        readOnly
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 font-mono"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        type="button"
        onClick={handleCopy}
        className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
