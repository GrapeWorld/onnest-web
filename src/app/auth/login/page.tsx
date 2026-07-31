"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
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

      router.push("/my");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="로그인"
      description="이메일과 비밀번호로 온네스트 계정에 로그인하세요."
      showNav={false}
    >
      <div className="mx-auto max-w-md">
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <label className="grid gap-2 text-sm font-semibold text-forest">
              이메일
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none"
                placeholder="hello@onnesthome.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest">
              비밀번호
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none"
                placeholder="비밀번호"
              />
            </label>
            {error && (
              <p className="text-sm font-semibold text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-ink/60">
            아직 계정이 없으신가요?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold text-forest hover:underline"
            >
              회원가입
            </Link>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
