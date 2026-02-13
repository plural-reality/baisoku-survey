import { QuestionFlow } from "@/components/question/question-flow";
import { VotematchSession } from "@/components/preset/votematch-session";
import { VoiceQuestionFlow } from "@/components/voice/voice-question-flow";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface SessionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const VOTEMATCH_TITLE = "2026年の衆議院選挙 ボートマッチ";

export default async function SessionPage({
  params,
  searchParams,
}: SessionPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, purpose, status, title")
    .eq("id", id)
    .single();

  if (!session) {
    redirect("/");
  }

  const isVoiceMode = resolvedSearchParams.mode === "voice";
  const isVotematch = session.title === VOTEMATCH_TITLE;

  // 音声モードの場合は専用のフルスクリーンレイアウト
  if (isVoiceMode) {
    return (
      <main className="min-h-screen bg-white">
        <VoiceQuestionFlow sessionId={id} />
      </main>
    );
  }

  // ボートマッチの場合は専用のレイアウト
  if (isVotematch) {
    return (
      <main className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 pb-6">
          <VotematchSession sessionId={id} />
        </div>
      </main>
    );
  }

  // 通常のセッション
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-lg font-medium text-gray-900 line-clamp-2">
            {session.title || session.purpose}
          </h1>
        </div>

        <QuestionFlow sessionId={id} />
      </div>
    </main>
  );
}
