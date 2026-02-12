"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import type { QuestionType, ScaleConfig } from "@/types";

interface QuestionCardProps {
  questionIndex: number;
  statement: string;
  detail: string;
  options: string[];
  selectedOption: number | null;
  freeText: string | null;
  onSelect: (optionIndex: number, freeText?: string | null) => void;
  onSubmitAnswer?: (params: {
    selectedOption?: number | null;
    freeText?: string | null;
    selectedOptions?: number[] | null;
    answerText?: string | null;
  }) => void;
  isLoading?: boolean;
  source?: "ai" | "fixed";
  questionType?: QuestionType;
  scaleConfig?: ScaleConfig | null;
  selectedOptions?: number[] | null;
  answerText?: string | null;
}

type MainAnswer = "yes" | "unknown" | "no" | "neither" | null;

const FREE_TEXT_OPTION_INDEX = 6;

export function QuestionCard({
  questionIndex,
  statement,
  detail,
  options,
  selectedOption,
  freeText,
  onSelect,
  onSubmitAnswer,
  isLoading = false,
  source,
  questionType,
  scaleConfig,
  selectedOptions: savedSelectedOptions,
  answerText: savedAnswerText,
}: QuestionCardProps) {
  const isFixedQuestion = source === "fixed";
  const qt = questionType || "radio";

  // For fixed questions with non-radio types, use specialized renderers
  if (isFixedQuestion && qt !== "radio") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
        <QuestionHeader statement={statement} detail={detail} required />
        <div className="space-y-3">
          {qt === "checkbox" && (
            <CheckboxAnswer
              options={options}
              savedSelectedOptions={savedSelectedOptions}
              isLoading={isLoading}
              onSubmit={(selected) => onSubmitAnswer?.({ selectedOptions: selected })}
            />
          )}
          {qt === "dropdown" && (
            <DropdownAnswer
              options={options}
              selectedOption={selectedOption}
              isLoading={isLoading}
              onSelect={(idx) => onSelect(idx, null)}
            />
          )}
          {(qt === "text" || qt === "textarea") && (
            <TextAnswer
              isTextarea={qt === "textarea"}
              savedText={savedAnswerText}
              isLoading={isLoading}
              onSubmit={(text) => onSubmitAnswer?.({ answerText: text })}
            />
          )}
          {qt === "scale" && (
            <ScaleAnswer
              scaleConfig={scaleConfig}
              selectedOption={selectedOption}
              isLoading={isLoading}
              onSelect={(val) => onSelect(val, null)}
            />
          )}
        </div>
      </div>
    );
  }

  // Determine main answer from selectedOption
  const getMainAnswerFromOption = (option: number | null): MainAnswer => {
    if (option === null) return null;
    if (option === 0) return "yes";
    if (option === 1) return "unknown";
    if (option === 2) return "no";
    return "neither"; // 3, 4, 5, 6
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
      <QuestionHeader statement={statement} detail={detail} required={isFixedQuestion} />
      <div className="space-y-3">
        {isFixedQuestion ? (
          <FixedRadioAnswer
            options={options}
            selectedOption={selectedOption}
            isLoading={isLoading}
            onSelect={onSelect}
          />
        ) : (
          <AIQuestionAnswer
            options={options}
            selectedOption={selectedOption}
            freeText={freeText}
            isLoading={isLoading}
            onSelect={onSelect}
            getMainAnswerFromOption={getMainAnswerFromOption}
          />
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function QuestionHeader({ statement, detail, required }: { statement: string; detail: string; required?: boolean }) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 leading-snug">
        {statement}
        {required && <span className="text-red-500 ml-1">*</span>}
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed">{detail}</p>
    </div>
  );
}

function FixedRadioAnswer({ options, selectedOption, isLoading, onSelect }: {
  options: string[];
  selectedOption: number | null;
  isLoading: boolean;
  onSelect: (idx: number, freeText?: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => { if (!isLoading) onSelect(index, null); }}
          disabled={isLoading}
          className={cn(
            "w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            selectedOption === index
              ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm"
              : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
              selectedOption === index ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
            )}>
              {selectedOption === index && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-sm">{option}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function CheckboxAnswer({ options, savedSelectedOptions, isLoading, onSubmit }: {
  options: string[];
  savedSelectedOptions?: number[] | null;
  isLoading: boolean;
  onSubmit: (selected: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(savedSelectedOptions || []));
  const [submitted, setSubmitted] = useState(!!savedSelectedOptions?.length);

  useEffect(() => {
    if (savedSelectedOptions) setSelected(new Set(savedSelectedOptions));
  }, [savedSelectedOptions]);

  const toggle = (idx: number) => {
    if (isLoading) return;
    setSubmitted(false);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    onSubmit(Array.from(selected).sort((a, b) => a - b));
    setSubmitted(true);
  };

  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => toggle(index)}
          disabled={isLoading}
          className={cn(
            "w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
            selected.has(index)
              ? "border-blue-500 bg-blue-50 text-blue-800 shadow-sm"
              : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
              selected.has(index) ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
            )}>
              {selected.has(index) && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            <span className="text-sm">{option}</span>
          </div>
        </button>
      ))}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading || selected.size === 0}
        className={cn(
          "w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 mt-2",
          "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          submitted
            ? "bg-green-50 border-green-300 text-green-700"
            : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700",
          (isLoading || selected.size === 0) && "opacity-50 cursor-not-allowed"
        )}
      >
        {submitted ? "確定済み" : "確定する"}
      </button>
    </div>
  );
}

function DropdownAnswer({ options, selectedOption, isLoading, onSelect }: {
  options: string[];
  selectedOption: number | null;
  isLoading: boolean;
  onSelect: (idx: number) => void;
}) {
  return (
    <select
      value={selectedOption ?? ""}
      onChange={(e) => {
        if (!isLoading && e.target.value !== "") onSelect(Number(e.target.value));
      }}
      disabled={isLoading}
      className={cn(
        "w-full px-4 py-3 rounded-xl border-2 bg-white text-sm transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
        selectedOption !== null ? "border-blue-500 text-blue-800" : "border-gray-200 text-gray-700",
        isLoading && "opacity-50 cursor-not-allowed"
      )}
    >
      <option value="">選択してください</option>
      {options.map((option, index) => (
        <option key={index} value={index}>{option}</option>
      ))}
    </select>
  );
}

function TextAnswer({ isTextarea, savedText, isLoading, onSubmit }: {
  isTextarea: boolean;
  savedText?: string | null;
  isLoading: boolean;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState(savedText ?? "");
  const [submitted, setSubmitted] = useState(!!savedText);

  useEffect(() => {
    if (savedText) setText(savedText);
  }, [savedText]);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setSubmitted(true);
  };

  return (
    <div className="space-y-2">
      {isTextarea ? (
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setSubmitted(false); }}
          disabled={isLoading}
          rows={4}
          maxLength={5000}
          className={cn(
            "w-full px-4 py-3 rounded-xl border-2 bg-white text-sm transition-all duration-200 resize-none",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            submitted ? "border-green-300" : "border-gray-200",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          placeholder="回答を入力してください..."
        />
      ) : (
        <input
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setSubmitted(false); }}
          disabled={isLoading}
          maxLength={1000}
          className={cn(
            "w-full px-4 py-3 rounded-xl border-2 bg-white text-sm transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            submitted ? "border-green-300" : "border-gray-200",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          placeholder="回答を入力してください..."
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{text.length}/{isTextarea ? 5000 : 1000}文字</span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            submitted
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-blue-600 text-white hover:bg-blue-700",
            (isLoading || !text.trim()) && "opacity-50 cursor-not-allowed"
          )}
        >
          {submitted ? "更新済み" : "送信する"}
        </button>
      </div>
    </div>
  );
}

function ScaleAnswer({ scaleConfig, selectedOption, isLoading, onSelect }: {
  scaleConfig?: ScaleConfig | null;
  selectedOption: number | null;
  isLoading: boolean;
  onSelect: (val: number) => void;
}) {
  const min = scaleConfig?.min ?? 1;
  const max = scaleConfig?.max ?? 5;
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        {scaleConfig?.minLabel && (
          <span className="text-xs text-gray-500 shrink-0 mr-2">{scaleConfig.minLabel}</span>
        )}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          {values.map((val) => (
            <button
              key={val}
              onClick={() => { if (!isLoading) onSelect(val); }}
              disabled={isLoading}
              className={cn(
                "w-10 h-10 rounded-full border-2 text-sm font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                selectedOption === val
                  ? "border-blue-500 bg-blue-500 text-white shadow-sm"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {val}
            </button>
          ))}
        </div>
        {scaleConfig?.maxLabel && (
          <span className="text-xs text-gray-500 shrink-0 ml-2">{scaleConfig.maxLabel}</span>
        )}
      </div>
    </div>
  );
}

// --- AI Question Answer (original logic) ---

function AIQuestionAnswer({
  options,
  selectedOption,
  freeText,
  isLoading,
  onSelect,
  getMainAnswerFromOption,
}: {
  options: string[];
  selectedOption: number | null;
  freeText: string | null;
  isLoading: boolean;
  onSelect: (idx: number, freeText?: string | null) => void;
  getMainAnswerFromOption: (option: number | null) => MainAnswer;
}) {
  const [expandNeither, setExpandNeither] = useState(false);
  const [draftText, setDraftText] = useState(freeText ?? "");
  const mainAnswer = getMainAnswerFromOption(selectedOption);

  const isNeitherPending = expandNeither && (selectedOption === null || selectedOption < 3);

  useEffect(() => {
    if (selectedOption !== null && selectedOption >= 3) {
      setExpandNeither(true);
    }
  }, [selectedOption]);

  useEffect(() => {
    if (selectedOption === FREE_TEXT_OPTION_INDEX) {
      setDraftText(freeText ?? "");
    }
  }, [selectedOption, freeText]);

  const handleMainSelect = (answer: MainAnswer) => {
    if (isLoading) return;
    if (answer === "yes") { setExpandNeither(false); setDraftText(""); onSelect(0, null); }
    else if (answer === "unknown") { setExpandNeither(false); setDraftText(""); onSelect(1, null); }
    else if (answer === "no") { setExpandNeither(false); setDraftText(""); onSelect(2, null); }
    else if (answer === "neither") { setExpandNeither(!expandNeither); }
  };

  const handleSubOptionSelect = (subIndex: number) => {
    if (isLoading) return;
    setDraftText("");
    onSelect(subIndex + 3, null);
  };

  const handleOtherSubmit = () => {
    if (isLoading) return;
    const trimmed = draftText.trim();
    if (!trimmed) return;
    onSelect(FREE_TEXT_OPTION_INDEX, trimmed);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button onClick={() => handleMainSelect("yes")} disabled={isLoading}
          className={cn("flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
            mainAnswer === "yes" ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm focus:ring-emerald-500" : "bg-white border-gray-200 text-gray-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 focus:ring-emerald-500",
            isLoading && "opacity-50 cursor-not-allowed")}>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <svg className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-colors", mainAnswer === "yes" ? "text-emerald-500" : "text-gray-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>はい</span>
          </div>
        </button>
        <button onClick={() => handleMainSelect("unknown")} disabled={isLoading}
          className={cn("flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
            mainAnswer === "unknown" ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm focus:ring-amber-500" : "bg-white border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 focus:ring-amber-500",
            isLoading && "opacity-50 cursor-not-allowed")}>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <svg className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-colors", mainAnswer === "unknown" ? "text-amber-500" : "text-gray-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>わからない</span>
          </div>
        </button>
        <button onClick={() => handleMainSelect("no")} disabled={isLoading}
          className={cn("flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500",
            mainAnswer === "no" ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600",
            isLoading && "opacity-50 cursor-not-allowed")}>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <svg className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-colors", mainAnswer === "no" ? "text-rose-500" : "text-gray-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>いいえ</span>
          </div>
        </button>
      </div>

      <button onClick={() => handleMainSelect("neither")} disabled={isLoading}
        className={cn("w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500",
          isNeitherPending ? "bg-slate-50/50 border-slate-300 border-dashed text-slate-600" : mainAnswer === "neither" ? "bg-slate-100 border-slate-400 text-slate-700 shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600",
          isLoading && "opacity-50 cursor-not-allowed")}>
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <svg className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-colors", isNeitherPending || mainAnswer === "neither" ? "text-slate-500" : "text-gray-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>どちらでもない</span>
          <svg className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200", expandNeither ? "rotate-180" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", expandNeither ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0")}>
        <div className={cn("pt-3 space-y-2 rounded-lg transition-all duration-200", isNeitherPending && "bg-blue-50/30 p-3 -mx-1 border border-blue-200")}>
          {isNeitherPending && (
            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-3 pb-2 border-b border-blue-200">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>以下から1つ選択して回答を完了してください</span>
            </div>
          )}
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">その他の立場を選択</p>
          {options.slice(3, 6).map((option, index) => (
            <button key={index} onClick={() => handleSubOptionSelect(index)} disabled={isLoading}
              className={cn("w-full text-left px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2",
                selectedOption === index + 3 ? "border-slate-400 bg-slate-50 text-slate-800" : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
                isLoading && "opacity-50 cursor-not-allowed")}>
              <div className="flex items-center gap-3">
                <span className={cn("flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  selectedOption === index + 3 ? "border-slate-500 bg-slate-500" : "border-gray-300 bg-white")}>
                  {selectedOption === index + 3 && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="text-sm">{option}</span>
              </div>
            </button>
          ))}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">または自由記述で回答</p>
            <div className={cn("rounded-lg border-2 p-4 transition-all duration-200",
              selectedOption === FREE_TEXT_OPTION_INDEX ? "border-violet-400 bg-violet-50/50" : "border-gray-200 bg-gray-50/50")}>
              <textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} disabled={isLoading}
                rows={3} maxLength={1000}
                className={cn("w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500",
                  isLoading && "opacity-50 cursor-not-allowed")}
                placeholder="選択肢にあてはまらない場合、立場を自由に記述してください" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">{draftText.length}/1000文字</span>
                <button type="button" onClick={handleOtherSubmit}
                  disabled={isLoading || draftText.trim().length === 0}
                  className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-violet-500 text-white hover:bg-violet-600",
                    (isLoading || draftText.trim().length === 0) && "opacity-50 cursor-not-allowed")}>
                  {selectedOption === FREE_TEXT_OPTION_INDEX ? "更新する" : "送信する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
