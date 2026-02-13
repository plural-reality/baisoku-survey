"use client";

import { useState, useEffect, useCallback } from "react";
import type { Question, Analysis, Session, Report } from "@/types";

interface QuestionWithAnswer extends Question {
  selectedOption: number | null;
  freeText: string | null;
  selectedOptions?: number[] | null;
  answerText?: string | null;
}

interface UseSessionOptions {
  autoGenerate?: boolean;
  refreshToken?: string | number | null;
}

export function useSession(sessionId: string, options: UseSessionOptions = {}) {
  const { autoGenerate = true, refreshToken = null } = options;
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch
  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch session");

        const data = await response.json();
        const questionList = (data.questions || []) as Question[];

        setSession(data.session);
        setQuestions(
          questionList.map((q: Question) => ({
            ...q,
            selectedOption: q.selectedOption ?? null,
            freeText: q.freeText ?? null,
            selectedOptions: q.selectedOptions ?? null,
            answerText: q.answerText ?? null,
          }))
        );
        setAnalyses(data.analyses);
        setReport(data.report);

        if (autoGenerate) {
          // If no questions yet, generate first batch
          if (questionList.length === 0) {
            await generateNextBatchInternal(1, 5);
          }

          const allAnswered =
            questionList.length > 0 &&
            questionList.every((q) => q.selectedOption !== null);
          if (allAnswered) {
            const lastIndex = Math.max(
              ...questionList.map((q) => q.question_index)
            );
            await generateNextBatchInternal(lastIndex + 1, lastIndex + 5);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, autoGenerate, refreshToken]);

  const generateNextBatchInternal = async (
    startIndex: number,
    endIndex: number
  ) => {
    setIsGeneratingQuestions(true);
    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, startIndex, endIndex }),
      });

      if (!response.ok) throw new Error("Failed to generate questions");

      const data = await response.json();
      setQuestions((prev) => [
        ...prev,
        ...data.questions.map((q: Question) => ({
          ...q,
          selectedOption: null,
          freeText: null,
        })),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const submitAnswer = useCallback(
    async (
      questionId: string,
      selectedOption: number | null,
      freeText?: string | null,
      opts?: {
        questionType?: string;
        selectedOptions?: number[] | null;
        answerText?: string | null;
      }
    ) => {
      try {
        const response = await fetch("/api/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            questionId,
            questionType: opts?.questionType ?? "radio",
            selectedOption: selectedOption ?? undefined,
            freeText: freeText ?? null,
            selectedOptions: opts?.selectedOptions ?? null,
            answerText: opts?.answerText ?? null,
          }),
        });

        if (!response.ok) throw new Error("Failed to save answer");

        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  selectedOption: selectedOption ?? null,
                  freeText: freeText ?? null,
                  selectedOptions: opts?.selectedOptions ?? null,
                  answerText: opts?.answerText ?? null,
                }
              : q
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [sessionId]
  );

  const generateNextBatch = useCallback(
    async (startIndex: number, endIndex: number) => {
      await generateNextBatchInternal(startIndex, endIndex);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId]
  );

  const generateAnalysis = useCallback(
    async (batchIndex: number, startIndex: number, endIndex: number) => {
      setIsGeneratingAnalysis(true);
      try {
        const response = await fetch("/api/analysis/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, batchIndex, startIndex, endIndex }),
        });

        if (!response.ok) throw new Error("Failed to generate analysis");

        const data = await response.json();
        setAnalyses((prev) => [...prev, data.analysis]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsGeneratingAnalysis(false);
      }
    },
    [sessionId]
  );

  const generateReport = useCallback(async () => {
    setIsGeneratingReport(true);
    try {
      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) throw new Error("Failed to generate report");

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsGeneratingReport(false);
    }
  }, [sessionId]);

  return {
    session,
    questions,
    analyses,
    report,
    isLoading,
    isGeneratingQuestions,
    isGeneratingAnalysis,
    isGeneratingReport,
    error,
    submitAnswer,
    generateNextBatch,
    generateAnalysis,
    generateReport,
  };
}
