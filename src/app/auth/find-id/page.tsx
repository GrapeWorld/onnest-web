"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

const inputClass =
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none";

export default function FindIdPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/find-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        return;
      }

      setMessage(data.message);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell
      title="아이디 찾기"
      description="온네스트는 이메일이 곧 로그인 아이디입니다. 이름과 휴대폰 번호 또는 이메일로 본인 확인 후, 가입하신 이메일로 아이디를 보내드립니다."
      showNav={false}
    >
      <div className="mx-auto max-w-md">
        <Card>
          {message ? (
            <div className="rounded-2xl bg-mint p-4 text-sm font-semibold leading-7 text-forest">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid w-full min-w-0 gap-4" noValidate>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-forest">
                이름
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  placeholder="홍길동"
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-forest">
                휴대폰 번호 또는 이메일
                <input
                  type="text"
                  required
                  autoComplete="tel email"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  className={inputClass}
                  placeholder="010-1234-5678 또는 hello@onnesthome.com"
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
                {loading ? "확인 중..." : "아이디(이메일) 받기"}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-ink/60">
            <Link href="/auth/login" className="font-semibold text-forest hover:underline">
              로그인으로 돌아가기
            </Link>
            {" · "}
            <Link href="/auth/forgot-password" className="font-semibold text-forest hover:underline">
              비밀번호 찾기
            </Link>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
