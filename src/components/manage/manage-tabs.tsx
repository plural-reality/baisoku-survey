"use client";

import { useState } from "react";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

const TABS = [
  { id: "responses", label: "回答" },
  { id: "settings", label: "設定" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface ManageTabsProps {
  token: string;
  preset: {
    slug: string;
    title: string;
    purpose: string;
    background_text: string | null;
    report_instructions: string | null;
    report_target: number;
    key_questions: string[];
  };
}

export function ManageTabs({ token, preset }: ManageTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("responses");

  return (
    <div>
      {/* Tab bar — Google Forms style */}
      <div className="flex justify-center border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "responses" && (
        <AdminDashboard token={token} />
      )}

      {activeTab === "settings" && (
        <PresetSettings preset={preset} />
      )}
    </div>
  );
}

function PresetSettings({
  preset,
}: {
  preset: ManageTabsProps["preset"];
}) {
  const surveyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/preset/${preset.slug}`
      : `/preset/${preset.slug}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル
          </label>
          <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
            {preset.title}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目的
          </label>
          <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 whitespace-pre-wrap">
            {preset.purpose}
          </p>
        </div>

        {preset.background_text && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              背景情報
            </label>
            <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 whitespace-pre-wrap line-clamp-6">
              {preset.background_text}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">設定</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            目標回答数
          </label>
          <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900">
            {preset.report_target}問
          </p>
        </div>

        {preset.report_instructions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              レポート指示
            </label>
            <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 whitespace-pre-wrap">
              {preset.report_instructions}
            </p>
          </div>
        )}

        {preset.key_questions && preset.key_questions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キークエスチョン
            </label>
            <ul className="space-y-1">
              {preset.key_questions.map((q: string, i: number) => (
                <li
                  key={i}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900"
                >
                  {i + 1}. {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">共有</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            回答用URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={surveyUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700 font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
