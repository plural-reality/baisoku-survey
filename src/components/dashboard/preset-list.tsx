import Link from "next/link";

interface PresetItem {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  created_at: string;
  session_count: number;
}

export function PresetList({ presets }: { presets: PresetItem[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700">
          最近のアンケート
        </h2>
      </div>

      {/* Grid layout — Google Forms style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {presets.map((preset) => (
          <Link
            key={preset.id}
            href={`/manage/${preset.slug}`}
            className="group block bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
          >
            {/* Color bar */}
            <div className="h-1.5 bg-blue-600" />

            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {preset.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {preset.purpose}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                <span>
                  {new Date(preset.created_at).toLocaleDateString("ja-JP")}
                </span>
                <span>{preset.session_count}件の回答</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
