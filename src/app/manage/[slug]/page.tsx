import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ManageTabs } from "@/components/manage/manage-tabs";

export const metadata: Metadata = {
  title: "管理画面 - 倍速アンケート",
  robots: { index: false, follow: false },
};

interface ManagePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get admin token for this preset owner
  const { data: tokenData, error: tokenError } = await supabase.rpc(
    "get_admin_token_for_owner",
    {
      p_slug: slug,
      p_user_id: user.id,
    }
  );

  if (tokenError || !tokenData || tokenData.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            アクセス権限がありません
          </h1>
          <p className="text-gray-600 text-sm mb-4">
            このアンケートの管理者ではないか、アンケートが存在しません。
          </p>
          <a href="/" className="text-sm text-blue-600 hover:text-blue-700">
            トップに戻る
          </a>
        </div>
      </main>
    );
  }

  const adminToken = tokenData[0].admin_token;

  // Get preset details for settings tab
  const { data: preset } = await supabase
    .from("presets")
    .select(
      "slug, title, purpose, background_text, report_instructions, report_target, key_questions"
    )
    .eq("slug", slug)
    .single();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header — Google Forms style */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="ダッシュボードに戻る"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {preset?.title ?? slug}
            </h1>
          </div>
        </div>

        <ManageTabs
          token={adminToken}
          preset={{
            slug: preset?.slug ?? slug,
            title: preset?.title ?? "",
            purpose: preset?.purpose ?? "",
            background_text: preset?.background_text ?? null,
            report_instructions: preset?.report_instructions ?? null,
            report_target: preset?.report_target ?? 25,
            key_questions: (preset?.key_questions as string[]) ?? [],
          }}
        />
      </div>
    </main>
  );
}
