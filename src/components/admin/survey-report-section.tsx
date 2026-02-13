"use client";

import { useEffect, useState } from "react";
import { SurveyReportView } from "./survey-report-view";

interface SurveyReportInfo {
  id: string;
  preset_id: string;
  version: number;
  report_text: string;
  custom_instructions: string | null;
  status: "generating" | "completed" | "failed";
  created_at: string;
}

interface ResponseInfo {
  session_id: string;
  question_index: number;
  statement: string;
  selected_option: number | null;
  options: string[];
  free_text: string | null;
  source?: string;
  question_type?: string;
  scale_config?: { min: number; max: number; minLabel?: string; maxLabel?: string } | null;
  selected_options?: number[] | null;
  answer_text?: string | null;
}

interface SessionInfo {
  id: string;
  created_at: string;
}

interface SurveyReportSectionProps {
  token: string;
  surveyReports: SurveyReportInfo[];
  sessions: SessionInfo[];
  responses: ResponseInfo[];
  onReportGenerated: (report: SurveyReportInfo) => void;
}

export function SurveyReportSection({
  token,
  surveyReports,
  sessions,
  responses,
  onReportGenerated,
}: SurveyReportSectionProps) {
  const [generating, setGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-expand latest completed report when data arrives asynchronously
  useEffect(() => {
    if (expandedReportId === null && surveyReports.length > 0) {
      const latest = surveyReports.find((r) => r.status === "completed");
      if (latest) {
        setExpandedReportId(latest.id);
      }
    }
  }, [surveyReports, expandedReportId]);

  // Build participant data for citation lookup (sorted by created_at asc for stable user numbering)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const participants = sortedSessions.map((session, idx) => {
    const sessionResponses = responses
      .filter((r) => r.session_id === session.id)
      .sort((a, b) => a.question_index - b.question_index);

    return {
      userNumber: idx + 1,
      sessionId: session.id,
      qa: sessionResponses.map((r) => ({
        question_index: r.question_index,
        statement: r.statement,
        selected_option: r.selected_option,
        options: r.options,
        free_text: r.free_text,
        answer_text: r.answer_text,
        selected_options: r.selected_options,
        question_type: r.question_type,
      })),
    };
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/${token}/survey-report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customInstructions: customInstructions.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "レポートの生成に失敗しました");
      }

      const data = await res.json();
      onReportGenerated(data.report);
      setCustomInstructions("");
      setExpandedReportId(data.report.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        全体レポート
      </h2>

      {/* Generate controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">
            全参加者の回答をもとに、アンケート全体の傾向を分析するレポートを生成します。
          </p>

          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="追加の指示（任意）: 年代別の傾向にも注目してほしい、特定のテーマについて深掘りしてほしい..."
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 resize-y min-h-[56px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || sessions.length === 0}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {generating && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {generating ? "生成中..." : "レポートを生成"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Report list */}
      {surveyReports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            まだ全体レポートがありません。上のボタンからレポートを生成してください。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveyReports.map((report) => {
            const isExpanded = expandedReportId === report.id;

            return (
              <div
                key={report.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedReportId(isExpanded ? null : report.id)
                  }
                  disabled={report.status === "generating"}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors disabled:cursor-default"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ReportStatusBadge status={report.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        バージョン {report.version}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleString("ja-JP")}
                        {report.custom_instructions && (
                          <span className="ml-2 text-gray-400">
                            指示あり
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {report.status !== "generating" && (
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
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
                  )}
                </button>

                {isExpanded && report.status === "completed" && (
                  <div className="border-t border-gray-100 px-4 py-6">
                    {report.custom_instructions && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          生成時の指示
                        </p>
                        <p className="text-sm text-gray-700">
                          {report.custom_instructions}
                        </p>
                      </div>
                    )}
                    <SurveyReportView
                      reportText={report.report_text}
                      participants={participants}
                    />
                  </div>
                )}

                {isExpanded && report.status === "failed" && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <p className="text-sm text-red-600">
                      レポートの生成に失敗しました。再度お試しください。
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReportStatusBadge({
  status,
}: {
  status: "generating" | "completed" | "failed";
}) {
  const config =
    status === "completed"
      ? { label: "完了", className: "bg-green-100 text-green-700" }
      : status === "generating"
        ? { label: "生成中", className: "bg-yellow-100 text-yellow-700" }
        : { label: "失敗", className: "bg-red-100 text-red-700" };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {status === "generating" && (
        <span className="inline-block w-3 h-3 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin mr-1" />
      )}
      {config.label}
    </span>
  );
}
