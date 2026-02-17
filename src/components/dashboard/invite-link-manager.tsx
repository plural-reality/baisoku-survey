"use client";

import { useState, useCallback } from "react";

interface InviteLink {
  id: string;
  token: string;
  label: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
}

export function InviteLinkManager({
  initialLinks,
}: {
  initialLinks: InviteLink[];
}) {
  const [links, setLinks] = useState<InviteLink[]>(initialLinks);
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createLink = useCallback(async () => {
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/invite-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || "招待リンク" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "作成に失敗しました");
        return;
      }
      setLinks((prev) => [data.inviteLink, ...prev]);
      setLabel("");
    } catch {
      setError("作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  }, [label]);

  const toggleActive = useCallback(async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/invite-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const data = await res.json();
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? data.inviteLink : l))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const deleteLink = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/invite-links/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      // ignore
    }
  }, []);

  const copyUrl = useCallback((token: string, id: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  return (
    <div>
      <h2 className="text-sm font-medium text-[var(--foreground)] mb-3">
        招待リンク
      </h2>
      <p className="text-xs text-[var(--muted-foreground)] mb-4">
        リンクを知っている人がゲストとしてアンケートを作成・回答できます。
      </p>

      {/* Create form */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ラベル（任意）"
          className="flex-1 px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
        />
        <button
          onClick={createLink}
          disabled={isCreating}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {isCreating ? "作成中..." : "作成"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}

      {/* Links list */}
      {links.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
          まだ招待リンクがありません。
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className={`p-3 border rounded-lg ${
                link.is_active
                  ? "border-[var(--border)] bg-[var(--card)]"
                  : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {link.label || "招待リンク"}
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      link.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {link.is_active ? "有効" : "無効"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <code className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded flex-1 truncate">
                  /invite/{link.token}
                </code>
                <button
                  onClick={() => copyUrl(link.token, link.id)}
                  className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700 transition-colors shrink-0"
                >
                  {copiedId === link.id ? "コピー済み" : "URLコピー"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>
                  使用回数: {link.use_count}
                  {link.max_uses ? ` / ${link.max_uses}` : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(link.id, link.is_active)}
                    className="hover:text-[var(--foreground)] transition-colors"
                  >
                    {link.is_active ? "無効化" : "有効化"}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
