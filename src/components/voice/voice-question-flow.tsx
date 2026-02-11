"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { useDeepgramSTT } from "@/hooks/use-deepgram-stt";
import { cn } from "@/lib/utils/cn";
import { VoiceRecordingIndicator } from "./voice-recording-indicator";
import { AnalysisBlock } from "@/components/analysis/analysis-block";
import { AnalysisSkeleton } from "@/components/analysis/analysis-skeleton";

interface VoiceQuestionFlowProps {
  sessionId: string;
}

const BATCH_SIZE = 5;
const REPORT_TARGET = 50;
const FREE_TEXT_OPTION_INDEX = 6;

export function VoiceQuestionFlow({ sessionId }: VoiceQuestionFlowProps) {
  const router = useRouter();
  const {
    session,
    questions,
    analyses,
    isLoading,
    isGeneratingQuestions,
    isGeneratingAnalysis,
    submitAnswer,
    generateNextBatch,
    generateAnalysis,
    generateReport,
  } = useSession(sessionId);

  const {
    isConnected,
    isConnecting,
    partialTranscript,
    committedTranscript,
    error: sttError,
    start: startSTT,
    stop: stopSTT,
    clearTranscript,
  } = useDeepgramSTT({ language: "ja" });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  // Track which analysis the user has dismissed (batch index)
  const [dismissedAnalysisBatch, setDismissedAnalysisBatch] = useState(0);

  // Track answered count for batch processing
  const answeredCount = questions.filter(
    (q) => q.selectedOption !== null
  ).length;

  // Unanswered questions
  const unansweredQuestions = questions.filter(
    (q) => q.selectedOption === null
  );

  // Current question
  const currentQuestion = unansweredQuestions[0] ?? null;

  // Previous answered question count for reference
  const prevAnsweredRef = useRef(answeredCount);

  // Determine if we should show an analysis interstitial
  const currentBatchIndex =
    answeredCount > 0 && answeredCount % BATCH_SIZE === 0
      ? answeredCount / BATCH_SIZE
      : 0;
  const pendingAnalysis =
    currentBatchIndex > 0 && currentBatchIndex > dismissedAnalysisBatch
      ? analyses.find((a) => a.batch_index === currentBatchIndex)
      : null;
  const showAnalysisInterstitial =
    pendingAnalysis !== null && pendingAnalysis !== undefined;
  const showAnalysisLoading =
    currentBatchIndex > 0 &&
    currentBatchIndex > dismissedAnalysisBatch &&
    !pendingAnalysis &&
    isGeneratingAnalysis;

  // Combine committed + partial for display
  const fullTranscript = committedTranscript
    ? partialTranscript
      ? committedTranscript + " " + partialTranscript
      : committedTranscript
    : partialTranscript;

  // Start the voice session
  const handleStart = useCallback(async () => {
    setHasStarted(true);
    await startSTT();
  }, [startSTT]);

  // Dismiss analysis and continue to next question
  const handleDismissAnalysis = useCallback(() => {
    setDismissedAnalysisBatch(currentBatchIndex);
  }, [currentBatchIndex]);

  // Save current answer and advance to next question
  const handleNext = useCallback(async () => {
    // If analysis interstitial is showing, dismiss it
    if (showAnalysisInterstitial || showAnalysisLoading) {
      handleDismissAnalysis();
      return;
    }

    if (!currentQuestion || isTransitioning) return;

    setIsTransitioning(true);

    // Flush: combine committed + any remaining partial transcript
    const allText = [committedTranscript, partialTranscript]
      .map((s) => s.trim())
      .filter(Boolean)
      .join("");

    if (allText) {
      // Save as free text answer
      await submitAnswer(currentQuestion.id, FREE_TEXT_OPTION_INDEX, allText);
    } else {
      // Skip — submit as "unknown" (option 1) if nothing was said
      await submitAnswer(currentQuestion.id, 1, null);
    }

    clearTranscript();

    // Brief transition delay for visual feedback
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, [
    currentQuestion,
    committedTranscript,
    partialTranscript,
    submitAnswer,
    clearTranscript,
    isTransitioning,
    showAnalysisInterstitial,
    showAnalysisLoading,
    handleDismissAnalysis,
  ]);

  // Spacebar to advance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && hasStarted) {
        // Prevent page scroll
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, hasStarted]);

  // Auto-generate next batch when batch is complete
  useEffect(() => {
    const batchComplete =
      answeredCount > 0 && answeredCount % BATCH_SIZE === 0;

    if (
      batchComplete &&
      !isGeneratingAnalysis &&
      !isGeneratingQuestions &&
      !processingBatch &&
      answeredCount > prevAnsweredRef.current
    ) {
      const batchIndex = answeredCount / BATCH_SIZE;
      const analysisExists = analyses.some(
        (a) => a.batch_index === batchIndex
      );
      const startIndex = (batchIndex - 1) * BATCH_SIZE + 1;
      const endIndex = batchIndex * BATCH_SIZE;
      const nextStartIndex = endIndex + 1;
      const nextEndIndex = endIndex + BATCH_SIZE;
      const nextBatchCount = questions.filter(
        (q) =>
          q.question_index >= nextStartIndex &&
          q.question_index <= nextEndIndex
      ).length;
      const needsNextBatch = nextBatchCount < BATCH_SIZE;

      if (!analysisExists || needsNextBatch) {
        setProcessingBatch(true);
        const tasks: Promise<unknown>[] = [];
        if (!analysisExists) {
          tasks.push(generateAnalysis(batchIndex, startIndex, endIndex));
        }
        if (needsNextBatch) {
          tasks.push(generateNextBatch(nextStartIndex, nextEndIndex));
        }
        Promise.all(tasks)
          .then(() => {
            prevAnsweredRef.current = answeredCount;
          })
          .finally(() => setProcessingBatch(false));
      } else {
        // Nothing to do for this batch — advance ref to avoid re-entry
        prevAnsweredRef.current = answeredCount;
      }
    }
  }, [
    answeredCount,
    analyses,
    isGeneratingAnalysis,
    isGeneratingQuestions,
    processingBatch,
    generateAnalysis,
    generateNextBatch,
    questions,
  ]);

  // Handle finish
  const handleFinish = useCallback(async () => {
    stopSTT();
    setIsFinishing(true);
    await generateReport();
    router.push(`/report/${sessionId}`);
  }, [stopSTT, generateReport, router, sessionId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-3">
              音声で回答する
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-2">
              質問が表示されたら、思ったことをそのまま声に出してください。
            </p>
            <p className="text-gray-400 text-xs leading-relaxed">
              「はい」「いいえ」だけでも、詳しく説明しても構いません。
              <br />
              話し終わったらスペースキーを押すか、「次へ」ボタンで進みます。
            </p>
          </div>

          {session?.title && (
            <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
              <p className="text-xs text-gray-400 mb-1">テーマ</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {session.title}
              </p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={isConnecting}
            className="w-full py-4 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isConnecting ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                マイクに接続中...
              </span>
            ) : (
              "マイクをオンにして開始"
            )}
          </button>

          <p className="text-xs text-gray-400 mt-4">
            ブラウザからマイクへのアクセスを許可してください
          </p>
        </div>
      </div>
    );
  }

  // Finished / generating report
  if (isFinishing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">結果を分析中...</p>
          <p className="text-gray-400 text-sm mt-2">
            回答をもとにレポートを作成しています
          </p>
        </div>
      </div>
    );
  }

  // All questions answered — show finish
  if (!currentQuestion && questions.length > 0 && !isGeneratingQuestions) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="text-4xl mb-4">
            <svg className="w-16 h-16 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {answeredCount}問の回答が完了しました
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            十分なデータが集まりました。結果を確認できます。
          </p>
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            結果を見る
          </button>
        </div>
      </div>
    );
  }

  // Waiting for questions to generate
  if (!currentQuestion && isGeneratingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">次の質問を準備中...</p>
        </div>
      </div>
    );
  }

  // Analysis interstitial — shown after every 5 questions
  if (showAnalysisInterstitial || showAnalysisLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Top bar — progress */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">
                {answeredCount} / {Math.max(REPORT_TARGET, questions.length)}
              </span>
              {answeredCount >= BATCH_SIZE && (
                <button
                  onClick={handleFinish}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  回答を終了
                </button>
              )}
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(answeredCount / Math.max(REPORT_TARGET, questions.length)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Analysis content — centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="max-w-lg w-full">
            {showAnalysisLoading ? (
              <AnalysisSkeleton />
            ) : (
              pendingAnalysis && (
                <AnalysisBlock
                  batchIndex={pendingAnalysis.batch_index}
                  text={pendingAnalysis.analysis_text}
                />
              )
            )}
          </div>
        </div>

        {/* Bottom bar — continue button */}
        <div className="flex-shrink-0 px-6 pb-8 pt-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleDismissAnalysis}
              disabled={showAnalysisLoading}
              className={cn(
                "w-full py-4 rounded-xl font-medium text-sm transition-all duration-200",
                showAnalysisLoading
                  ? "bg-gray-100 text-gray-300"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              )}
            >
              {showAnalysisLoading ? "分析中..." : "次の質問へ進む"}
            </button>
            {!showAnalysisLoading && (
              <p className="text-center text-xs text-gray-300 mt-3">
                スペースキーでも次へ進めます
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main voice question interface
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar — progress + controls */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          {/* Progress */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">
              {answeredCount + 1} / {Math.max(REPORT_TARGET, questions.length)}
            </span>
            {isConnected && <VoiceRecordingIndicator />}
            {answeredCount >= BATCH_SIZE && (
              <button
                onClick={handleFinish}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                回答を終了
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${(answeredCount / Math.max(REPORT_TARGET, questions.length)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Question area — centered vertically */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-lg w-full">
          {currentQuestion && (
            <div
              className={cn(
                "transition-all duration-300",
                isTransitioning
                  ? "opacity-0 translate-y-4"
                  : "opacity-100 translate-y-0"
              )}
            >
              {/* Question number */}
              <div className="flex items-center gap-3 mb-6">
                <span className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
                  {currentQuestion.question_index}
                </span>
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                  {currentQuestion.phase === "exploration"
                    ? "探索"
                    : "深掘り"}
                </span>
              </div>

              {/* Statement */}
              <h2 className="text-2xl font-semibold text-gray-900 leading-snug mb-3">
                {currentQuestion.statement}
              </h2>

              {/* Detail */}
              {currentQuestion.detail && (
                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                  {currentQuestion.detail}
                </p>
              )}

              {/* Answer guidance */}
              <p className="text-sm text-gray-400 mb-8">
                同意するなら「はい」、違うなら「いいえ」と答えてください。他に思うことがあれば自由にどうぞ。
              </p>

              {/* Transcript display */}
              <div className="min-h-[80px] mb-8">
                {fullTranscript ? (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {committedTranscript}
                      {partialTranscript && (
                        <span className="text-gray-400">
                          {committedTranscript ? " " : ""}
                          {partialTranscript}
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-dashed border-gray-200">
                    <p className="text-sm text-gray-300 text-center">
                      {isConnected
                        ? "声に出して回答してください..."
                        : "マイクに接続中..."}
                    </p>
                  </div>
                )}
              </div>

              {/* STT error */}
              {sttError && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">{sttError}</p>
                  <button
                    onClick={startSTT}
                    className="text-xs text-red-700 underline mt-1"
                  >
                    再接続
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar — next button */}
      <div className="flex-shrink-0 px-6 pb-8 pt-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleNext}
            disabled={isTransitioning || !currentQuestion}
            className={cn(
              "w-full py-4 rounded-xl font-medium text-sm transition-all duration-200",
              fullTranscript
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
            )}
          >
            {fullTranscript ? "次の質問へ" : "スキップ"}
          </button>
          <p className="text-center text-xs text-gray-300 mt-3">
            スペースキーでも次へ進めます
          </p>
        </div>
      </div>
    </div>
  );
}
