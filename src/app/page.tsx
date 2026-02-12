import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PresetList } from "@/components/dashboard/preset-list";
import { AppHeader } from "@/components/ui/app-header";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware enforces login, but guard just in case
  if (!user) return null;

  // Fetch user's presets
  let userPresets: Array<{
    id: string;
    slug: string;
    title: string;
    purpose: string;
    created_at: string;
    session_count: number;
  }> = [];

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
      )
      .eq("status", "completed");

    const countMap: Record<string, number> = {};
    sessions?.forEach((s) => {
      countMap[s.preset_id] = (countMap[s.preset_id] || 0) + 1;
    });

    userPresets = presets.map((p) => ({
      ...p,
      session_count: countMap[p.id] || 0,
    }));
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <AppHeader showLogo userEmail={user.email ?? null} />

        {/* Create new — Google Forms style */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[var(--foreground)] mb-3">
            新しいアンケートを作成
          </p>
          <Link
            href="/create"
            className="inline-flex items-center justify-center w-40 h-28 bg-[var(--card)] border-2 border-[var(--border)] rounded-lg hover:border-blue-400 hover:shadow-md transition-all group"
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

        {userPresets.length > 0 ? (
          <PresetList presets={userPresets} />
        ) : (
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] text-sm">
              まだアンケートがありません。上の「+」から作成してみましょう。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
