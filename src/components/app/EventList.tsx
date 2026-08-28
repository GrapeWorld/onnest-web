"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { DateField } from "@/components/ui/DateField";

export type EventRow = {
  id: string;
  title: string;
  memo: string | null;
  done: boolean;
  /** 서버에서 미리 포맷한 값. 클라이언트 시간대에 영향받지 않게 한다. */
  dateLabel: string;
  /** <input type="date"> 초기값용 "YYYY-MM-DD". */
  dateValue: string;
  weekday: string;
  dday: string;
  past: boolean;
};

const fieldClass =
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-3 py-2 text-base text-ink outline-none focus:border-forest";

export function EventList({
  projectId,
  events,
}: {
  projectId: string;
  events: EventRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleDone(event: EventRow) {
    setBusyId(event.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !event.done }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("변경에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(event: EventRow) {
    if (!window.confirm(`"${event.title}" 일정을 삭제할까요?`)) return;

    setBusyId(event.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/events/${event.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (events.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="font-semibold text-forest">등록된 일정이 없습니다.</p>
        <p className="mt-2 text-sm text-ink/60">
          계약일, 전입신고, 확정일자처럼 놓치면 안 되는 날짜를 먼저 넣어보세요.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event) =>
        editingId === event.id ? (
          <EventEditCard
            key={event.id}
            projectId={projectId}
            event={event}
            onCancel={() => setEditingId(null)}
            onSaved={() => {
              setEditingId(null);
              router.refresh();
            }}
          />
        ) : (
          <Card
            key={event.id}
            className={`flex flex-wrap items-center gap-4 p-5 ${
              event.done ? "opacity-60" : ""
            }`}
          >
            <button
              type="button"
              disabled={busyId === event.id}
              onClick={() => toggleDone(event)}
              aria-pressed={event.done}
              aria-label={`${event.title} 완료 표시`}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition disabled:opacity-50 ${
                event.done
                  ? "bg-forest text-white"
                  : "border border-forest/20 bg-white text-forest hover:border-forest/50"
              }`}
            >
              {event.done ? "✓" : ""}
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`font-bold text-forest ${event.done ? "line-through" : ""}`}
                >
                  {event.title}
                </p>
                {!event.done && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      event.past ? "bg-cream text-ink/60" : "bg-mint text-forest"
                    }`}
                  >
                    {event.dday}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink/60">
                {event.dateLabel} ({event.weekday})
              </p>
              {event.memo && (
                <p className="mt-1 text-sm text-ink/55">{event.memo}</p>
              )}
            </div>

            <button
              type="button"
              disabled={busyId === event.id}
              onClick={() => setEditingId(event.id)}
              className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-forest/70 hover:bg-cream disabled:opacity-50"
            >
              수정
            </button>
            <button
              type="button"
              disabled={busyId === event.id}
              onClick={() => remove(event)}
              className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-ink/50 hover:bg-cream hover:text-red-600 disabled:opacity-50"
            >
              삭제
            </button>
          </Card>
        ),
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function EventEditCard({
  projectId,
  event,
  onCancel,
  onSaved,
}: {
  projectId: string;
  event: EventRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.dateValue);
  const [memo, setMemo] = useState(event.memo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim() || !date) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, memo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "수정에 실패했습니다.");
        return;
      }
      onSaved();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="grid gap-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-forest min-w-0">
          일정 이름
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={saving}
            maxLength={100}
            className={`${fieldClass} disabled:opacity-60`}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-forest min-w-0">
          날짜
          <DateField
            value={date}
            onChange={setDate}
            disabled={saving}
            className={`${fieldClass} disabled:opacity-60`}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-forest min-w-0">
        메모 <span className="font-normal text-ink/50">선택 입력</span>
        <input
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          disabled={saving}
          maxLength={300}
          className={`${fieldClass} disabled:opacity-60`}
        />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim() || !date}
          className="rounded-full bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full border border-forest/15 px-5 py-2 text-sm font-semibold text-forest/70 hover:bg-cream disabled:opacity-60"
        >
          취소
        </button>
      </div>
    </Card>
  );
}
