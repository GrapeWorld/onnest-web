"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MemberNoteItem({
  noteId,
  body,
  authorEmail,
  timestamp,
  canEdit,
}: {
  noteId: string;
  body: string;
  authorEmail: string;
  timestamp: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/member-notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "메모 수정에 실패했습니다.");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-cream px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-xs text-ink/55">
        <span>
          {authorEmail} · {timestamp}
        </span>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(body);
              setEditing(true);
            }}
            className="font-semibold text-forest hover:underline"
          >
            수정
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 grid gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={saving}
            rows={3}
            className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
          />
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="rounded-full bg-forest px-4 py-1.5 text-xs font-bold text-white hover:bg-forest/90 disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="rounded-full border border-forest/15 px-4 py-1.5 text-xs font-semibold text-forest/70 hover:bg-white"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{body}</p>
      )}
    </div>
  );
}
