"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SurveyReportSection } from "./survey-report-section";
import { QRCodeSVG } from "qrcode.react";

const POLLING_INTERVAL_MS = 10_000;

interface PresetInfo {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  created_at: string;
}

interface SessionInfo {
  id: string;
  title: string | null;
  status: string;
  current_question_index: number;
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

interface ReportInfo {
  session_id: string;
  report_text: string;
}

interface SurveyReportInfo {
  id: string;
  preset_id: string;
  version: number;
  report_text: string;
  custom_instructions: string | null;
  status: "generating" | "completed" | "failed";
  created_at: string;
}

interface AdminData {
  preset: PresetInfo;
  sessions: SessionInfo[];
  responses: ResponseInfo[];
  reports: ReportInfo[];
  surveyReports: SurveyReportInfo[];
}

export function AdminDashboard({ token }: { token: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [surveyReports, setSurveyReports] = useState<SurveyReportInfo[]>([]);
  const [showQR, setShowQR] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(
    async (isInitial: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const response = await fetch(`/api/admin/${token}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "管理画面が見つかりません。URLを確認してください。"
            );
          }
          throw new Error("データの取得に失敗しました");
        }
        const json = await response.json();
        setData(json);
        setLastUpdated(new Date());
        setError(null);
        setSurveyReports(json.surveyReports || []);
      } catch (err) {
        if (isInitial) {
          setError(
            err instanceof Error ? err.message : "予期せぬエラーが発生しました"
          );
        }
      } finally {
        fetchingRef.current = false;
        if (isInitial) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchData(true);
    intervalRef.current = setInterval(() => {
      fetchData(false);
    }, POLLING_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const handleSurveyReportGenerated = (report: SurveyReportInfo) => {
    setSurveyReports((prev) => [report, ...prev]);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-3">読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || "データの取得に失敗しました"}
        </div>
      </div>
    );
  }

  const { preset, sessions, responses, reports } = data;
  const surveyUrl = `${window.location.origin}/preset/${preset.slug}`;
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="space-y-6">
      {/* Compact header: URL + Stats in one card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">回答用URL</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {showQR ? "QR非表示" : "QR表示"}
            </button>
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse" />
                {lastUpdated.toLocaleTimeString("ja-JP")}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={surveyUrl}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <CopyButton text={surveyUrl} />
        </div>

        {showQR && (
          <div className="flex justify-center py-3 border-t border-gray-100">
            <QRCodeSVG value={surveyUrl} size={140} />
          </div>
        )}

        {/* Inline stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{sessions.length}</p>
            <p className="text-xs text-gray-500">総回答数</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">
              {completedSessions.length}
            </p>
            <p className="text-xs text-gray-500">完了</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-blue-600">
              {activeSessions.length}
            </p>
            <p className="text-xs text-gray-500">回答中</p>
          </div>
        </div>
      </div>

      {/* Survey aggregate report */}
      <SurveyReportSection
        token={token}
        surveyReports={surveyReports}
        sessions={sessions}
        responses={responses}
        onReportGenerated={handleSurveyReportGenerated}
      />

      {/* Sessions list */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          回答一覧（{sessions.length}件）
        </h2>
        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">
              まだ回答がありません。URLを共有して回答を集めましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session, idx) => {
              const sessionResponses = responses.filter(
                (r) => r.session_id === session.id
              );
              const sessionReport = reports.find(
                (r) => r.session_id === session.id
              );
              const isExpanded = expandedSession === session.id;

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedSession(isExpanded ? null : session.id)
                    }
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={session.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          回答 #{idx + 1}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(session.created_at).toLocaleString(
                            "ja-JP"
                          )}{" "}
                          / {session.current_question_index}問回答
                        </p>
                      </div>
                    </div>
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
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                      {sessionResponses.length > 0 ? (
                        <div className="space-y-2">
                          {sessionResponses
                            .sort(
                              (a, b) => a.question_index - b.question_index
                            )
                            .map((r, i) => (
                              <div
                                key={i}
                                className="text-sm border border-gray-100 rounded-lg p-3"
                              >
                                <p className="text-gray-500 text-xs mb-1">
                                  Q{r.question_index}. {r.statement}
                                </p>
                                <p className="text-gray-900">
                                  {r.selected_option !== null && r.selected_option >= r.options.length &&
                                  r.free_text
                                    ? r.free_text
                                    : r.answer_text || (r.selected_option !== null ? (r.options[r.selected_option] ??
                                      `選択肢 ${r.selected_option}`) : "(未回答)")}
                                </p>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          まだ回答がありません
                        </p>
                      )}

                      {sessionReport && (
                        <Link
                          href={`/report/${session.id}`}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          target="_blank"
                        >
                          レポートを表示
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            />
                          </svg>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config =
    status === "completed"
      ? { label: "完了", className: "bg-green-100 text-green-700" }
      : status === "active"
        ? { label: "回答中", className: "bg-blue-100 text-blue-700" }
        : { label: "中断", className: "bg-gray-100 text-gray-700" };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
