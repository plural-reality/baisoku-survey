"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { UserQuestionCitation } from "../report/user-question-citation";

interface ParticipantQA {
  question_index: number;
  statement: string;
  selected_option: number | null;
  options: string[];
  free_text: string | null;
  answer_text?: string | null;
  selected_options?: number[] | null;
  question_type?: string;
}

interface ParticipantData {
  userNumber: number;
  sessionId: string;
  qa: ParticipantQA[];
}

interface SurveyReportViewProps {
  reportText: string;
  participants: ParticipantData[];
}

function getAnswerLabel(
  options: string[],
  selectedOption: number | null,
  freeText: string | null,
  answerText?: string | null,
  selectedOptions?: number[] | null,
  questionType?: string,
): string | null {
  if (questionType === "text" || questionType === "textarea") {
    return answerText || freeText || null;
  }
  if (questionType === "checkbox" && selectedOptions) {
    return selectedOptions.map((i) => options[i] || `選択肢${i}`).join(", ") || null;
  }
  if (selectedOption === null) return answerText || null;
  if (selectedOption === 6) {
    const trimmed = freeText?.trim();
    return trimmed ? `その他（自由記述）: ${trimmed}` : "その他（自由記述）";
  }
  return options[selectedOption] ?? null;
}

export function SurveyReportView({
  reportText,
  participants,
}: SurveyReportViewProps) {
  // Build a lookup: { "U1-Q12": { userNumber, questionIndex, statement, selectedAnswer } }
  const citationLookup = new Map<
    string,
    {
      userNumber: number;
      questionIndex: number;
      statement: string;
      selectedAnswer: string | null;
    }
  >();

  for (const p of participants) {
    for (const qa of p.qa) {
      const key = `U${p.userNumber}-Q${qa.question_index}`;
      citationLookup.set(key, {
        userNumber: p.userNumber,
        questionIndex: qa.question_index,
        statement: qa.statement,
        selectedAnswer: getAnswerLabel(
          qa.options,
          qa.selected_option,
          qa.free_text,
          qa.answer_text,
          qa.selected_options,
          qa.question_type,
        ),
      });
    }
  }

  const normalizedReportText = reportText
    .replace(/\*\*([「『])/g, "**\u200b$1")
    .replace(/([」』])\*\*/g, "$1\u200b**");

  const renderTextWithCitations = (text: string): React.ReactNode => {
    // Match [U1-Q12] or [U1Q12] or ［U1-Q12］ patterns
    const citationSplitRegex =
      /((?:\[|［)U\d+[-]?Q\d+(?:\]|］))/g;
    const citationMatchRegex =
      /(?:\[|［)U(\d+)[-]?Q(\d+)(?:\]|］)/;

    if (!citationMatchRegex.test(text)) return text;

    const parts = text.split(citationSplitRegex);
    return parts.map((part, i) => {
      const match = part.match(citationMatchRegex);
      if (!match) return part;

      const userNum = Number(match[1]);
      const qNum = Number(match[2]);
      const key = `U${userNum}-Q${qNum}`;
      const data = citationLookup.get(key);
      if (!data) return part;

      return (
        <UserQuestionCitation
          key={`citation-${key}-${i}`}
          userNumber={data.userNumber}
          questionIndex={data.questionIndex}
          statement={data.statement}
          selectedAnswer={data.selectedAnswer}
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
            <blockquote {...props}>
              {renderWithCitations(children)}
            </blockquote>
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
  );
}
