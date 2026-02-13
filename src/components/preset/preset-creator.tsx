"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PdfUpload } from "@/components/session/pdf-upload";

interface CreatedPreset {
  slug: string;
  adminToken: string;
}

type QuestionType = 'radio' | 'checkbox' | 'dropdown' | 'text' | 'textarea' | 'scale';

interface ScaleConfig {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

interface FixedQuestionInput {
  statement: string;
  detail: string;
  options: string[];
  question_type?: QuestionType;
  scale_config?: ScaleConfig | null;
}

const EMPTY_FIXED_QUESTION: FixedQuestionInput = {
  statement: "",
  detail: "",
  options: ["", ""],
  question_type: "radio",
};

export function PresetCreator() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [backgroundText, setBackgroundText] = useState("");
  const [reportInstructions, setReportInstructions] = useState("");
  const [keyQuestions, setKeyQuestions] = useState<string[]>([]);
  const [fixedQuestions, setFixedQuestions] = useState<FixedQuestionInput[]>([]);
  const [isGeneratingKeyQuestions, setIsGeneratingKeyQuestions] =
    useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [reportTarget, setReportTarget] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedPreset | null>(null);

  // --- Key questions helpers ---
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
        throw new Error(data.error || "項目の生成に失敗しました");
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

  const generateBackground = useCallback(async () => {
    if (!purpose.trim()) return;
    setIsGeneratingBackground(true);
    setError(null);
    try {
      const response = await fetch("/api/presets/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || undefined, purpose }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "背景情報の生成に失敗しました");
      }
      const { backgroundText: generated } = await response.json();
      setBackgroundText(generated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsGeneratingBackground(false);
    }
  }, [purpose, title]);

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

  // --- Fixed questions helpers ---
  const addFixedQuestion = () => {
    setFixedQuestions((prev) => [
      ...prev,
      { ...EMPTY_FIXED_QUESTION, options: ["", ""] },
    ]);
  };

  const removeFixedQuestion = (index: number) => {
    setFixedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFixedQuestion = (
    index: number,
    field: keyof FixedQuestionInput,
    value: string
  ) => {
    setFixedQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateFixedQuestionOption = (
    qIndex: number,
    oIndex: number,
    value: string
  ) => {
    setFixedQuestions((prev) => {
      const updated = [...prev];
      const options = [...updated[qIndex].options];
      options[oIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options };
      return updated;
    });
  };

  const addFixedQuestionOption = (qIndex: number) => {
    setFixedQuestions((prev) => {
      const updated = [...prev];
      updated[qIndex] = {
        ...updated[qIndex],
        options: [...updated[qIndex].options, ""],
      };
      return updated;
    });
  };

  const removeFixedQuestionOption = (qIndex: number, oIndex: number) => {
    setFixedQuestions((prev) => {
      const updated = [...prev];
      const options = updated[qIndex].options.filter((_, i) => i !== oIndex);
      updated[qIndex] = { ...updated[qIndex], options };
      return updated;
    });
  };

  const updateFixedQuestionType = (qIndex: number, type: QuestionType) => {
    setFixedQuestions((prev) => {
      const updated = [...prev];
      const q = { ...updated[qIndex], question_type: type };
      if (type === 'text' || type === 'textarea') {
        q.options = [];
        q.scale_config = null;
      } else if (type === 'scale') {
        q.options = [];
        q.scale_config = q.scale_config || { min: 1, max: 5 };
      } else {
        q.scale_config = null;
        if (q.options.length < 2) q.options = ["", ""];
      }
      updated[qIndex] = q;
      return updated;
    });
  };

  const updateScaleConfig = (qIndex: number, field: keyof ScaleConfig, value: string | number) => {
    setFixedQuestions((prev) => {
      const updated = [...prev];
      const config = { ...(updated[qIndex].scale_config || { min: 1, max: 5 }) };
      if (field === 'min' || field === 'max') {
        config[field] = Number(value) || 0;
      } else {
        (config as Record<string, unknown>)[field] = value;
      }
      updated[qIndex] = { ...updated[qIndex], scale_config: config };
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
      const filteredFixedQuestions = fixedQuestions
        .filter((q) => q.statement.trim())
        .map((q) => ({
          statement: q.statement,
          detail: q.detail,
          options: q.options.filter((o) => o.trim()),
          question_type: q.question_type || 'radio',
          ...(q.scale_config ? { scale_config: q.scale_config } : {}),
        }))
        .filter((q) => {
          if (q.question_type === 'text' || q.question_type === 'textarea') return true;
          if (q.question_type === 'scale') return true;
          return q.options.length >= 2;
        });

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
          fixedQuestions:
            filteredFixedQuestions.length > 0
              ? filteredFixedQuestions
              : undefined,
          reportTarget,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "アンケートの作成に失敗しました");
      }

      const { preset } = await response.json();

      // Save to localStorage for history
      try {
        const presets = JSON.parse(
          localStorage.getItem("sonar_presets") || "[]"
        );
        presets.unshift({
          slug: preset.slug,
          title,
          adminToken: preset.adminToken,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(
          "sonar_presets",
          JSON.stringify(presets.slice(0, 20))
        );
        window.dispatchEvent(new Event("sonar_presets_updated"));
      } catch {
        // localStorage unavailable
      }

      // Redirect to manage page seamlessly
      router.push(`/manage/${preset.slug}`);
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
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
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
            <p className="text-xs text-gray-600 mb-2">
              このURLを回答者に共有してください
            </p>
            <CopyableUrl url={surveyUrl} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              管理画面URL
            </label>
            <p className="text-xs text-gray-600 mb-2">
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
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: 基本情報（回答者に表示） */}
      <fieldset className="space-y-5 rounded-xl border border-green-200 bg-green-50/30 p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-green-800">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
          回答者に表示される情報
        </legend>

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：新サービスのコンセプトについて"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="background"
              className="block text-sm font-medium text-gray-900"
            >
              説明文{" "}
              <span className="text-xs font-normal text-gray-500">任意</span>
            </label>
            <button
              type="button"
              onClick={generateBackground}
              disabled={isGeneratingBackground || !purpose.trim()}
              className="text-xs px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingBackground ? "生成中..." : "AIで生成する"}
            </button>
          </div>
          <p className="text-xs text-green-700/70 mb-2">
            回答開始前に回答者に表示される前提情報です。
          </p>
          <textarea
            id="background"
            value={backgroundText}
            onChange={(e) => setBackgroundText(e.target.value)}
            placeholder="例：サービスの概要、ターゲットユーザー、競合との違いなど"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none bg-white"
            rows={4}
          />
        </div>

        <PdfUpload onExtract={handlePdfExtract} />
      </fieldset>

      {/* Section 2: 固定質問（Google Forms的な質問設定） */}
      <fieldset className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/30 p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-blue-800">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
          固定質問
          <span className="text-xs font-normal text-blue-600">
            全員に共通で聞く質問
          </span>
        </legend>

        <p className="text-xs text-blue-700/70">
          追加すると、全回答者に同じ質問が必須で表示されます。AIが各回答者に合わせた深掘り質問も自動追加します。
        </p>

        {fixedQuestions.map((q, qIndex) => {
          const qType = q.question_type || 'radio';
          const needsOptions = qType !== 'text' && qType !== 'textarea' && qType !== 'scale';
          return (
          <div
            key={qIndex}
            className="bg-white rounded-lg border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs text-gray-400 mt-2 shrink-0">
                Q{qIndex + 1}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={q.statement}
                  onChange={(e) =>
                    updateFixedQuestion(qIndex, "statement", e.target.value)
                  }
                  placeholder="質問文を入力..."
                  className="w-full px-3 py-2 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm bg-transparent"
                />
                <input
                  type="text"
                  value={q.detail}
                  onChange={(e) =>
                    updateFixedQuestion(qIndex, "detail", e.target.value)
                  }
                  placeholder="補足説明（任意）"
                  className="w-full px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100 focus:border-blue-300 focus:outline-none bg-transparent"
                />
              </div>
              <select
                value={qType}
                onChange={(e) => updateFixedQuestionType(qIndex, e.target.value as QuestionType)}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white shrink-0 mt-1"
              >
                <option value="radio">ラジオボタン</option>
                <option value="checkbox">チェックボックス</option>
                <option value="dropdown">プルダウン</option>
                <option value="text">短文テキスト</option>
                <option value="textarea">段落テキスト</option>
                <option value="scale">均等目盛</option>
              </select>
              <button
                type="button"
                onClick={() => removeFixedQuestion(qIndex)}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-1"
                title="質問を削除"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
              </button>
            </div>

            {/* Scale config */}
            {qType === 'scale' && (
              <div className="pl-7 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                <label className="flex items-center gap-1">
                  最小
                  <input
                    type="number"
                    value={q.scale_config?.min ?? 1}
                    onChange={(e) => updateScaleConfig(qIndex, 'min', e.target.value)}
                    className="w-14 px-2 py-1 border border-gray-200 rounded text-center"
                  />
                </label>
                <label className="flex items-center gap-1">
                  最大
                  <input
                    type="number"
                    value={q.scale_config?.max ?? 5}
                    onChange={(e) => updateScaleConfig(qIndex, 'max', e.target.value)}
                    className="w-14 px-2 py-1 border border-gray-200 rounded text-center"
                  />
                </label>
                <label className="flex items-center gap-1">
                  左ラベル
                  <input
                    type="text"
                    value={q.scale_config?.minLabel ?? ''}
                    onChange={(e) => updateScaleConfig(qIndex, 'minLabel', e.target.value)}
                    placeholder="例: 全く思わない"
                    className="w-28 px-2 py-1 border border-gray-200 rounded"
                  />
                </label>
                <label className="flex items-center gap-1">
                  右ラベル
                  <input
                    type="text"
                    value={q.scale_config?.maxLabel ?? ''}
                    onChange={(e) => updateScaleConfig(qIndex, 'maxLabel', e.target.value)}
                    placeholder="例: 強く思う"
                    className="w-28 px-2 py-1 border border-gray-200 rounded"
                  />
                </label>
              </div>
            )}

            {/* Text/textarea preview */}
            {(qType === 'text' || qType === 'textarea') && (
              <div className="pl-7 text-xs text-gray-400 italic py-2">
                {qType === 'text' ? '回答者が短文テキストを入力します' : '回答者が段落テキストを入力します'}
              </div>
            )}

            {/* Options (radio/checkbox/dropdown only) */}
            {needsOptions && (
            <div className="space-y-1.5 pl-7">
              {q.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  {qType === 'checkbox' ? (
                    <span className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <input
                    type="text"
                    value={option}
                    onChange={(e) =>
                      updateFixedQuestionOption(qIndex, oIndex, e.target.value)
                    }
                    placeholder={`選択肢 ${oIndex + 1}`}
                    className="flex-1 px-2 py-1.5 text-sm border-b border-gray-100 focus:border-blue-400 focus:outline-none bg-transparent"
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeFixedQuestionOption(qIndex, oIndex)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 10 && (
                <button
                  type="button"
                  onClick={() => addFixedQuestionOption(qIndex)}
                  className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                >
                  <span className={`w-4 h-4 border-2 border-dashed border-gray-300 shrink-0 ${qType === 'checkbox' ? 'rounded' : 'rounded-full'}`} />
                  選択肢を追加
                </button>
              )}
            </div>
            )}
          </div>
          );
        })}

        <button
          type="button"
          onClick={addFixedQuestion}
          className="w-full py-3 border-2 border-dashed border-blue-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
        >
          + 質問を追加
        </button>
      </fieldset>

      {/* Section 3: AI深掘り設定 */}
      <fieldset className="space-y-5 rounded-xl border border-purple-200 bg-purple-50/30 p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-purple-800">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          AI深掘り設定
          <span className="text-xs font-normal text-purple-600">
            回答者には表示されません
          </span>
        </legend>

        <div>
          <label
            htmlFor="purpose"
            className="block text-sm font-medium text-gray-900 mb-1"
          >
            深掘りの目的 <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-purple-700/70 mb-2">
            AIがこの目的に沿って、各回答者に合わせた追加質問を自動生成します。
          </p>
          <textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="例：新しく開発中のサービスのコンセプトに対する率直な意見を聞きたい。特に、ターゲットユーザーの課題解決に本当に役立つかを確認したい。"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white"
            rows={3}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-900">
              探索テーマ{" "}
              <span className="text-xs font-normal text-gray-500">任意</span>
            </label>
            <button
              type="button"
              onClick={generateKeyQuestions}
              disabled={isGeneratingKeyQuestions || !purpose.trim()}
              className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingKeyQuestions ? "生成中..." : "AIで生成する"}
            </button>
          </div>
          <p className="text-xs text-purple-700/70 mb-3">
            AIが深掘りする際に重点的に探索するテーマです。
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
                    if (
                      dragIndex !== null &&
                      dragOverIndex !== null &&
                      dragIndex !== dragOverIndex
                    ) {
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
                      setDragOverIndex((prev) =>
                        prev === index ? null : prev
                      );
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className={`flex gap-1.5 items-start rounded-lg transition-colors ${
                    dragIndex === index
                      ? "opacity-40"
                      : dragOverIndex === index && dragIndex !== null
                        ? "bg-purple-50 ring-1 ring-purple-200"
                        : ""
                  }`}
                >
                  <div
                    className="mt-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                    title="ドラッグで並び替え"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500 mt-3 min-w-[1.25rem] text-right">
                    {index + 1}.
                  </span>
                  <textarea
                    value={question}
                    onChange={(e) => updateKeyQuestion(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
                    rows={3}
                    style={
                      { fieldSizing: "content" } as React.CSSProperties
                    }
                    placeholder="探索テーマを入力..."
                  />
                  <button
                    type="button"
                    onClick={() => removeKeyQuestion(index)}
                    className="mt-2 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                    title="削除"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
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
            + テーマを追加
          </button>
        </div>
      </fieldset>

      {/* Section 4: 詳細設定 */}
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          詳細設定
        </button>
      </div>

      {showAdvanced && (
        <fieldset className="space-y-5 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
          <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-gray-600">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
            詳細設定
          </legend>

          <div>
            <label
              htmlFor="reportInstructions"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              レポートのカスタマイズ{" "}
              <span className="text-xs font-normal text-gray-500">任意</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              回答完了後にAIが自動生成するレポートへの追加指示です。
            </p>
            <textarea
              id="reportInstructions"
              value={reportInstructions}
              onChange={(e) => setReportInstructions(e.target.value)}
              placeholder="例：賛否が分かれたポイントを重点的にまとめてほしい"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
              rows={3}
            />
          </div>

          <div>
            <label
              htmlFor="reportTarget"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              質問数（レポート生成まで）
            </label>
            <p className="text-xs text-gray-500 mb-2">
              AIが自動生成する質問の数です。この数に達するとレポートが生成されます。
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
        </fieldset>
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
