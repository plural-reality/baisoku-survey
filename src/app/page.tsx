import Link from "next/link";
import { SessionForm } from "@/components/session/session-form";
import { SessionList } from "@/components/session/session-list";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sonar</h1>
          <p className="text-gray-600">
            AIとの対話を通じて、あなたの考えを言語化する
          </p>
        </div>

        {/* 衆院選ボートマッチ */}
        <Link
          href="/preset/2026-shugiin-election"
          className="block rounded-xl p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:from-blue-100 hover:to-indigo-100 transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium mb-1">
                🗳 2026年2月 衆議院選挙
              </p>
              <p className="text-sm font-semibold text-gray-900">
                AIボートマッチはこちら
              </p>
            </div>
            <span className="text-blue-400 text-lg">→</span>
          </div>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <SessionForm />
        </div>

        <SessionList />
      </div>
    </main>
  );
}
