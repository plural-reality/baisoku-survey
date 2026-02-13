import { PresetCreator } from "@/components/preset/preset-creator";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/ui/app-header";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <AppHeader showLogo userEmail={user?.email ?? null} />

        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <PresetCreator />
        </div>
      </div>
    </main>
  );
}
