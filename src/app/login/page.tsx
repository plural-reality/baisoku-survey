"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const inviteError = searchParams.get("error") === "invalid_invite";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const redirectUrl = new URL("/auth/confirm", window.location.origin);
    if (next && next !== "/") redirectUrl.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl.toString(),
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-8 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-2">
          メールを確認してください
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm">
          <span className="font-medium">{email}</span>{" "}
          にログインリンクを送信しました。
          <br />
          メール内のリンクをクリックしてログインしてください。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-8">
      <h1 className="text-xl font-bold text-[var(--foreground)] mb-6 text-center">
        ログイン
      </h1>

      {inviteError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          招待リンクが無効または期限切れです。ログインしてご利用ください。
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--foreground)] mb-1"
          >
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-[var(--muted)]"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "送信中..." : "マジックリンクを送信"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full mx-auto px-4">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
