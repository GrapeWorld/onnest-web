"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sanitizeReturnTo } from "@/lib/oauth/returnTo";

const inputClass =
  "rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink focus:border-forest focus:outline-none";

export function SignupForm({ returnTo }: { returnTo?: string } = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!agreeTerms) {
      setError("이용약관 및 개인정보처리방침에 동의해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phone, agreeTerms }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "회원가입에 실패했습니다.");
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
    <>
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <label className="grid gap-2 text-sm font-semibold text-forest">
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
        <label className="grid gap-2 text-sm font-semibold text-forest">
          이메일
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
            placeholder="hello@onnesthome.com"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          휴대폰 번호
          <input
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
            placeholder="010-1234-5678"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          비밀번호
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
        <label className="grid gap-2 text-sm font-semibold text-forest">
          비밀번호 확인
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
        <label className="flex items-start gap-3 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(event) => setAgreeTerms(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-forest/30 text-forest focus:ring-forest"
          />
          <span>
            <Link href="/terms" className="font-semibold text-forest hover:underline">
              이용약관
            </Link>{" "}
            및{" "}
            <Link href="/privacy" className="font-semibold text-forest hover:underline">
              개인정보처리방침
            </Link>
            에 동의합니다.
          </span>
        </label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? "가입하는 중..." : "회원가입"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink/60">
        이미 계정이 있으신가요?{" "}
        <Link href="/auth/login" className="font-semibold text-forest hover:underline">
          로그인
        </Link>
      </p>
    </>
  );
}
