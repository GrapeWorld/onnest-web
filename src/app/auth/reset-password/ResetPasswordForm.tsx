"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

const inputClass =
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "비밀번호 재설정에 실패했습니다.");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="비밀번호 재설정"
      description="새로 쓸 비밀번호를 입력해주세요."
      showNav={false}
    >
      <div className="mx-auto max-w-md">
        <Card>
          {!token ? (
            <p className="text-sm font-semibold text-red-600">
              유효하지 않은 링크입니다. 비밀번호 찾기를 다시 시도해주세요.
            </p>
          ) : done ? (
            <div className="rounded-2xl bg-mint p-4 text-sm font-semibold leading-7 text-forest">
              비밀번호가 재설정되었습니다. 로그인 화면으로 이동합니다.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid w-full min-w-0 gap-4" noValidate>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-forest">
                새 비밀번호
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                  placeholder="8자 이상 입력해주세요"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-forest">
                새 비밀번호 확인
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClass}
                  placeholder="비밀번호를 다시 입력해주세요"
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
                {loading ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-ink/60">
            <Link href="/auth/login" className="font-semibold text-forest hover:underline">
              로그인으로 돌아가기
            </Link>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
