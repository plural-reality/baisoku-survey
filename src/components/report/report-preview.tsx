"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";

interface ReportPreviewProps {
  sessionId: string;
  reportText: string;
  version: number;
}

export function ReportPreview({
  sessionId,
  reportText,
  version,
}: ReportPreviewProps) {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5 md:p-6">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-emerald-200">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 shadow-sm">
          <svg
            className="w-4.5 h-4.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-emerald-800">
            診断レポート
          </h3>
          <p className="text-xs text-emerald-600">バージョン {version}</p>
        </div>
      </div>

      <div className="relative max-h-56 overflow-hidden">
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700">
          <ReactMarkdown>{reportText}</ReactMarkdown>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-emerald-50 to-transparent" />
      </div>

      <div className="mt-4">
        <Link
          href={`/report/${sessionId}`}
          className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          レポート全文を見る
        </Link>
      </div>
    </div>
  );
}
