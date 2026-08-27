"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead } from "@/lib/notificationClient";

export function MarkAllNotificationsReadButton() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={async () => {
        const ok = await markAllNotificationsRead();
        if (ok) {
          setDone(true);
          startTransition(() => router.refresh());
        }
      }}
      className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40 disabled:opacity-60"
    >
      모두 읽음으로 표시
    </button>
  );
}
