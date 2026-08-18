"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OAuthSignupCompleteForm({
  email,
  name: initialName,
}: {
  email: string;
  name: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/oauth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, agreeTerms }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "가입을 완료하지 못했습니다.");
        return;
      }

      router.push(data.returnTo ?? "/my");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 min-w-0" noValidate>
      <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
        이메일
        <input
          type="email"
          value={email}
          disabled
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 bg-cream px-4 py-3 text-base font-normal text-ink/60"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
        이름
        <input
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={loading}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none disabled:opacity-60"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
        휴대폰 번호 (선택)
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={loading}
          placeholder="010-1234-5678"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none disabled:opacity-60"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(event) => setAgreeTerms(event.target.checked)}
          disabled={loading}
          className="mt-1"
        />
        <span>
          <a href="/terms" className="font-semibold text-forest hover:underline">
            이용약관
          </a>
          {" 및 "}
          <a href="/privacy" className="font-semibold text-forest hover:underline">
            개인정보처리방침
          </a>
          에 동의합니다.
        </span>
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !agreeTerms || !name.trim()}
        className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading ? "가입 처리 중..." : "가입 완료"}
      </button>
    </form>
  );
}
