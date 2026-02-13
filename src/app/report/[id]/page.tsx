import { ReportView } from "@/components/report/report-view";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface ReportPageProps {
  params: Promise<{ id: string }>;
}

interface QuestionWithAnswer {
  question_index: number;
  statement: string;
  detail: string | null;
  options: string[];
  answers?: Array<{ selected_option: number; free_text: string | null }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch report
  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("session_id", id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) {
    redirect(`/session/${id}`);
  }

  // Fetch questions with answers
  const { data: questions } = await supabase
    .from("questions")
    .select("*, answers(*)")
    .eq("session_id", id)
    .order("question_index", { ascending: true });

  const questionsWithAnswers = ((questions as QuestionWithAnswer[]) || []).map(
    (q) => ({
      question_index: q.question_index,
      statement: q.statement,
      detail: q.detail || "",
      options: q.options as string[],
      selectedOption: q.answers?.[0]?.selected_option ?? null,
      freeText: q.answers?.[0]?.free_text ?? null,
    })
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="px-4 py-8 md:py-16">
        <ReportView
          sessionId={id}
          reportText={report.report_text}
          version={report.version}
          questions={questionsWithAnswers}
        />
      </div>
    </main>
  );
}
