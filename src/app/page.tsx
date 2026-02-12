import Image from "next/image";
import Link from "next/link";
import { PresetCreator } from "@/components/preset/preset-creator";
import { FormHistory } from "@/components/preset/form-history";
import { createClient } from "@/lib/supabase/server";
import { AuthHeader } from "@/components/auth/auth-header";
import { PresetList } from "@/components/dashboard/preset-list";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user's presets if logged in
  let userPresets: Array<{
    id: string;
    slug: string;
    title: string;
    purpose: string;
    created_at: string;
    session_count: number;
  }> = [];

  if (user) {
    const { data: presets } = await supabase
      .from("presets")
      .select("id, slug, title, purpose, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (presets && presets.length > 0) {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("preset_id")
        .in(
          "preset_id",
          presets.map((p) => p.id)
        );

      const countMap: Record<string, number> = {};
      sessions?.forEach((s) => {
        countMap[s.preset_id] = (countMap[s.preset_id] || 0) + 1;
      });

      userPresets = presets.map((p) => ({
        ...p,
        session_count: countMap[p.id] || 0,
      }));
    }
  }

  const showDashboard = user && userPresets.length > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Auth header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="倍速アンケート"
              width={120}
              height={24}
              priority
            />
          </div>
          {user ? (
            <AuthHeader email={user.email ?? ""} />
          ) : (
            <a
              href="/login"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ログイン
            </a>
          )}
        </div>

        {showDashboard ? (
          <>
            {/* Create new — Google Forms style */}
            <div className="mb-8">
              <p className="text-sm font-medium text-gray-700 mb-3">
                新しいアンケートを作成
              </p>
              <Link
                href="/create"
                className="inline-flex items-center justify-center w-40 h-28 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <svg
                  className="w-10 h-10 text-gray-300 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Link>
            </div>

            <PresetList presets={userPresets} />
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <p className="text-gray-600 text-sm">
                AIとの対話で、深い意見を素早く集める
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <PresetCreator />
            </div>
            <div className="mt-6">
              <FormHistory />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
