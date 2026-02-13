"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { QuestionCitation } from "./question-citation";

interface QuestionData {
  question_index: number;
  statement: string;
  detail: string;
  options: string[];
  selectedOption: number | null;
  freeText?: string | null;
}

interface ReportViewProps {
  sessionId: string;
  reportText: string;
  version: number;
  questions: QuestionData[];
}

export function ReportView({
  sessionId,
  reportText,
  version,
  questions,
}: ReportViewProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/report/${sessionId}`;
    const shareData = {
      title: "診断レポート",
      text: "診断レポートをシェアします",
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getAnswerLabel = (question: QuestionData): string | null => {
    if (question.selectedOption === null) return null;
    if (question.selectedOption === 5) {
      const trimmed = question.freeText?.trim();
      return trimmed ? `その他（自由記述）: ${trimmed}` : "その他（自由記述）";
    }
    return question.options[question.selectedOption] ?? null;
  };

  const normalizedReportText = reportText
    .replace(/\*\*([「『])/g, "**\u200b$1")
    .replace(/([」』])\*\*/g, "$1\u200b**");

  const renderTextWithCitations = (text: string): React.ReactNode => {
    const citationSplitRegex = /((?:\[|［)(?:Q)?\d+(?:\]|］))/g;
    const citationMatchRegex = /(?:\[|［)(?:Q)?(\d+)(?:\]|］)/;

    if (!citationMatchRegex.test(text)) return text;

    const parts = text.split(citationSplitRegex);
    return parts.map((part, i) => {
      const match = part.match(citationMatchRegex);
      if (!match) return part;

      const qNum = Number(match[1]);
      const question = questions.find((q) => q.question_index === qNum);
      if (!question) return part;

      return (
        <QuestionCitation
          key={`citation-${qNum}-${i}`}
          questionIndex={qNum}
          statement={question.statement}
          selectedAnswer={getAnswerLabel(question)}
        />
      );
    });
  };

  const renderWithCitations = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      return renderTextWithCitations(node);
    }
    if (Array.isArray(node)) {
      return node.map((child) => renderWithCitations(child));
    }
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
      if (node.type === "code" || node.type === "pre") {
        return node;
      }
      if (!node.props?.children) return node;
      return React.cloneElement(
        node,
        node.props,
        renderWithCitations(node.props.children)
      );
    }
    return node;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">診断レポート</h1>
          <p className="text-sm text-gray-500 mt-1">バージョン {version}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleShare}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            {copied ? "コピーしました" : "シェア"}
          </button>
          <button
            onClick={() => router.push(`/session/${sessionId}`)}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            回答を続ける
          </button>
        </div>
      </div>

      {/* Collapsible answer log */}
      {questions.length > 0 && (
        <AnswerLog questions={questions} getAnswerLabel={getAnswerLabel} />
      )}

      {/* AI Report section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-sm">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900">AIレポート</h2>
        </div>
        <div className="prose prose-blue max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700">
          <ReactMarkdown
            components={{
              p: ({ node, children, ...props }) => (
                <p {...props}>{renderWithCitations(children)}</p>
              ),
              li: ({ node, children, ...props }) => (
                <li {...props}>{renderWithCitations(children)}</li>
              ),
              blockquote: ({ node, children, ...props }) => (
                <blockquote {...props}>{renderWithCitations(children)}</blockquote>
              ),
              h1: ({ node, children, ...props }) => (
                <h1 {...props}>{renderWithCitations(children)}</h1>
              ),
              h2: ({ node, children, ...props }) => (
                <h2 {...props}>{renderWithCitations(children)}</h2>
              ),
              h3: ({ node, children, ...props }) => (
                <h3 {...props}>{renderWithCitations(children)}</h3>
              ),
              h4: ({ node, children, ...props }) => (
                <h4 {...props}>{renderWithCitations(children)}</h4>
              ),
              h5: ({ node, children, ...props }) => (
                <h5 {...props}>{renderWithCitations(children)}</h5>
              ),
              h6: ({ node, children, ...props }) => (
                <h6 {...props}>{renderWithCitations(children)}</h6>
              ),
            }}
          >
            {normalizedReportText}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function AnswerLog({
  questions,
  getAnswerLabel,
}: {
  questions: QuestionData[];
  getAnswerLabel: (q: QuestionData) => string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const answeredQuestions = questions.filter((q) => q.selectedOption !== null);

  return (
    <div className="mb-8 border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          回答ログ（{answeredQuestions.length}問）
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="divide-y divide-gray-100">
          {answeredQuestions.map((q) => (
            <div key={q.question_index} className="px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">
                Q{q.question_index}
              </p>
              <p className="text-sm text-gray-700">{q.statement}</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                → {getAnswerLabel(q) ?? "未回答"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
