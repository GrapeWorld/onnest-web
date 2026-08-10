"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { oauthProviderLabels, type OAuthProvider } from "@/data/oauthProviders";

export function DeleteAccountControl({
  counts,
  hasPassword,
  connections,
  deleteApproved,
}: {
  counts: { projects: number; documents: number };
  hasPassword: boolean;
  connections: { provider: OAuthProvider }[];
  deleteApproved: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 소셜 전용 계정(비밀번호 없음)은 재인증 없이 세션만으로 즉시 삭제하지
  // 않는다 — deleteApproved(짧은 수명의 재인증 성공 상태)가 있을 때만
  // 비밀번호 없이 삭제를 진행할 수 있다.
  const canDeleteWithoutPassword = !hasPassword && deleteApproved;

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDeleting(true);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasPassword ? { password } : {}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "탈퇴에 실패했습니다.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="border-red-200">
      <h2 className="text-xl font-black text-forest">회원 탈퇴</h2>
      <p className="mt-2 text-sm leading-7 text-ink/65">
        탈퇴하면 계정과 함께 아래 데이터가 모두 삭제되며 되돌릴 수 없습니다.
      </p>

      <ul className="mt-4 grid gap-2 text-sm text-ink/70">
        <li className="rounded-2xl bg-cream px-4 py-3">
          입주 프로젝트 {counts.projects}건 (단계 진행 상태, 체크리스트, 일정,
          서비스 신청, 생활 정보 포함)
        </li>
        <li className="rounded-2xl bg-cream px-4 py-3">
          문서함 파일 {counts.documents}건
        </li>
      </ul>

      <p className="mt-4 text-xs leading-6 text-ink/55">
        이미 접수된 문의는 상담 이력으로 남습니다. 삭제를 원하시면 문의로
        요청해주세요.
      </p>
      {!hasPassword && (
        <p className="mt-2 text-xs leading-6 text-ink/55">
          소셜 계정으로만 가입한 회원입니다. 탈퇴 전 연결된 소셜 계정으로
          한 번 더 재인증해주세요(연결된 provider 계정 자체가 삭제되는 것은
          아닙니다).
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          회원 탈퇴 진행
        </button>
      ) : hasPassword ? (
        <form onSubmit={handleDelete} className="mt-5 grid gap-3" noValidate>
          <label className="grid gap-2 text-sm font-semibold text-forest">
            확인을 위해 비밀번호를 입력해주세요
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={deleting || password.length === 0}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "탈퇴 처리 중..." : "영구 삭제"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setError(null);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 grid gap-3">
          {error && (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
            >
              {error}
            </p>
          )}

          {!canDeleteWithoutPassword ? (
            <>
              <p className="text-sm text-ink/65">
                연결된 계정 중 하나로 재인증해주세요.
              </p>
              <div className="flex flex-wrap gap-2">
                {connections.map(({ provider }) => (
                  <a
                    key={provider}
                    href={`/api/auth/oauth/${provider}/start?mode=delete-confirm&returnTo=${encodeURIComponent("/my")}`}
                    className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:bg-cream"
                  >
                    {oauthProviderLabels[provider]}로 재인증
                  </a>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleDelete} className="grid gap-3">
              <p className="text-sm font-semibold text-forest">
                재인증이 완료됐습니다. 삭제를 진행할까요?
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={deleting}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? "탈퇴 처리 중..." : "영구 삭제"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
