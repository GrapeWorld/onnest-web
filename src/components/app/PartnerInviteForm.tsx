"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { invitablePartnerRoles, partnerRoleLabels, type PartnerRole } from "@/data/partnerRole";

export function PartnerInviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PartnerRole>("STAFF");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    setError(null);
    setSent(false);

    try {
      const res = await fetch("/api/partner/team/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "초대 발송에 실패했습니다.");
        return;
      }
      setEmail("");
      setSent(true);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <label className="grid gap-1 text-sm font-semibold text-forest">
        이메일
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={sending}
          placeholder="staff@company.com"
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm font-normal outline-none focus:border-forest disabled:opacity-60"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-forest">
        역할
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as PartnerRole)}
          disabled={sending}
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm font-normal text-ink outline-none focus:border-forest disabled:opacity-60"
        >
          {invitablePartnerRoles.map((option) => (
            <option key={option} value={option}>
              {partnerRoleLabels[option]}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      {sent && <p className="text-sm font-semibold text-forest">초대 메일을 보냈습니다.</p>}
      <button
        type="submit"
        disabled={sending || !email.trim()}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {sending ? "발송 중..." : "초대 보내기"}
      </button>
    </form>
  );
}
