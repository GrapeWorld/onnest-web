"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sanitizeReturnTo } from "@/lib/oauth/returnTo";

export function LoginForm({ returnTo }: { returnTo?: string } = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "로그인에 실패했습니다.");
        return;
      }

      router.push(sanitizeReturnTo(returnTo));
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid w-full min-w-0 gap-4" noValidate>
      <label className="grid min-w-0 gap-2 text-sm font-semibold text-forest">
        이메일
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none"
          placeholder="hello@onnesthome.com"
        />
      </label>
      <label className="grid min-w-0 gap-2 text-sm font-semibold text-forest">
        비밀번호
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none"
          placeholder="비밀번호"
        />
      </label>
      {error && (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="box-border mt-2 inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}
