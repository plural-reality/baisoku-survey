"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function GuestPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function signInAsGuest() {
      const supabase = createClient();

      // If already logged in, redirect immediately
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/");
        return;
      }

      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        setError("ゲストログインに失敗しました。もう一度お試しください。");
        return;
      }

      router.replace("/");
    }

    signInAsGuest();
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-8 text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              再試行
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-[var(--muted-foreground)]">
          ゲストとしてログイン中...
        </p>
      </div>
    </main>
  );
}
