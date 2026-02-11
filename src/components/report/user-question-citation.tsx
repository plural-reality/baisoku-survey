"use client";

import { useState } from "react";

interface UserQuestionCitationProps {
  userNumber: number;
  questionIndex: number;
  statement: string;
  selectedAnswer: string | null;
}

export function UserQuestionCitation({
  userNumber,
  questionIndex,
  statement,
  selectedAnswer,
}: UserQuestionCitationProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex items-center justify-center min-w-[2.5rem] h-5 px-1 text-xs font-medium text-purple-600 bg-purple-100 rounded hover:bg-purple-200 transition-colors"
      >
        U{userNumber}-Q{questionIndex}
      </button>
      {showTooltip && (
        <span className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg block">
          <span className="text-purple-300 text-xs font-medium mb-1 block">
            参加者 U{userNumber}
          </span>
          <span className="font-medium mb-1 block">
            Q{questionIndex}: {statement}
          </span>
          {selectedAnswer && (
            <span className="text-gray-300 text-xs block">
              回答: {selectedAnswer}
            </span>
          )}
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 block" />
        </span>
      )}
    </span>
  );
}
