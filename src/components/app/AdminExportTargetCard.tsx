"use client";

import { useState } from "react";
import { AdminExportForm } from "./AdminExportForm";

export function AdminExportTargetCard({
  label,
  description,
  scope,
}: {
  label: string;
  description?: string;
  scope: { type: "CUSTOMER"; customerId: string; label: string } | { type: "PROJECT"; projectId: string; label: string };
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-2xl border border-forest/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="min-w-0 break-words font-semibold text-forest">{label}</p>
          {description && <p className="mt-1 min-w-0 break-words text-sm text-ink/55">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40"
        >
          {open ? "닫기" : "Excel 내보내기"}
        </button>
      </div>
      {open && (
        <div className="mt-4 border-t border-forest/10 pt-4">
          <AdminExportForm scope={scope} />
        </div>
      )}
    </li>
  );
}
