import { PresetCreator } from "@/components/preset/preset-creator";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/ui/app-header";
import { getGuestToken } from "@/lib/auth/guest";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const guestToken = await getGuestToken();
  const isGuest = !user && !!guestToken;

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <AppHeader
          showLogo
          userEmail={user?.email ?? null}
          isGuest={isGuest}
        />

        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6">
          <PresetCreator />
        </div>
      </div>
    </main>
  );
}
