"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface LocalPreset {
  slug: string;
  title: string;
  adminToken: string;
  createdAt: string;
}

export function FormHistory() {
  const [presets, setPresets] = useState<LocalPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadPresets = useCallback(() => {
    const stored = localStorage.getItem("sonar_presets");
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  useEffect(() => {
    loadPresets();

    const handleUpdate = () => loadPresets();
    window.addEventListener("sonar_presets_updated", handleUpdate);
    return () =>
      window.removeEventListener("sonar_presets_updated", handleUpdate);
  }, [loadPresets]);

  if (presets.length === 0) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-colors mx-auto"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
        作成したアンケート（{presets.length}件）
      </button>

      {isOpen && (
        <div className="mt-4 space-y-3">
          {presets.map((preset) => {
            const surveyUrl = `/preset/${preset.slug}`;
            const adminUrl = `/admin/${preset.adminToken}`;

            return (
              <div
                key={`${preset.slug}-${preset.createdAt}`}
                className="p-4 bg-white rounded-lg border border-gray-200"
              >
                <p className="text-gray-900 font-medium text-sm line-clamp-1">
                  {preset.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(preset.createdAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="flex gap-3 mt-2">
                  <Link
                    href={surveyUrl}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    回答ページ
                  </Link>
                  <Link
                    href={adminUrl}
                    className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    管理画面
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
