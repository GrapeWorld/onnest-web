"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

export function StepChecklist({
  projectId,
  slug,
  items,
  initialChecked,
}: {
  projectId: string;
  slug: string;
  items: string[];
  initialChecked: string[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(initialChecked),
  );
  const [error, setError] = useState<string | null>(null);

  async function toggle(label: string) {
    const next = !checked.has(label);

    // 낙관적 갱신. 실패하면 되돌린다.
    setChecked((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(label);
      else copy.delete(label);
      return copy;
    });
    setError(null);

    try {
      const res = await fetch(
        `/api/projects/${projectId}/steps/${slug}/checks`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, checked: next }),
        },
      );

      if (!res.ok) {
        throw new Error("save failed");
      }
      startTransition(() => router.refresh());
    } catch {
      setChecked((prev) => {
        const copy = new Set(prev);
        if (next) copy.delete(label);
        else copy.add(label);
        return copy;
      });
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    }
  }

  const done = items.filter((item) => checked.has(item)).length;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-forest">
          이 단계에서 확인할 것
        </h3>
        <span className="text-sm font-bold text-sage">
          {done}/{items.length}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const on = checked.has(item);
          return (
            <label
              key={item}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                on ? "bg-mint text-forest" : "bg-cream text-ink/70"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(item)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#123C35]"
              />
              <span className={on ? "" : "opacity-80"}>{item}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
      )}
    </Card>
  );
}
