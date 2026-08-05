"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { oauthProviders, oauthProviderLabels, type OAuthProvider } from "@/data/oauthProviders";

type Connection = { id: string; provider: OAuthProvider; providerEmail: string | null };

export function SocialAccountsPanel({
  connections,
  hasPassword,
  configuredProviders,
}: {
  connections: Connection[];
  hasPassword: boolean;
  configuredProviders: OAuthProvider[];
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastMethod = !hasPassword && connections.length === 1;

  async function handleDisconnect(id: string) {
    if (!window.confirm("이 계정 연결을 해제할까요?")) return;

    setDisconnecting(id);
    setError(null);
    try {
      const res = await fetch(`/api/me/social-accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "연결 해제에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink/60">
        비밀번호:{" "}
        {hasPassword ? (
          <span className="font-semibold text-forest">설정됨</span>
        ) : (
          <>
            <span className="font-semibold text-ink/60">설정되지 않음</span> ·{" "}
            <Link href="/auth/forgot-password" className="font-semibold text-forest hover:underline">
              비밀번호 설정하기
            </Link>
          </>
        )}
      </p>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <ul className="grid gap-2">
        {oauthProviders
          .filter((provider) => configuredProviders.includes(provider))
          .map((provider) => {
            const connection = connections.find((c) => c.provider === provider);
            return (
              <li
                key={provider}
                className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-forest">{oauthProviderLabels[provider]}</p>
                  {connection ? (
                    <p className="mt-0.5 text-xs text-ink/55">
                      {connection.providerEmail ?? "연결됨"}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-ink/45">연결되지 않음</p>
                  )}
                </div>
                {connection ? (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(connection.id)}
                    disabled={disconnecting === connection.id || lastMethod}
                    title={lastMethod ? "마지막 남은 로그인 방법은 해제할 수 없습니다." : undefined}
                    className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {disconnecting === connection.id ? "해제 중..." : "연결 해제"}
                  </button>
                ) : (
                  <a
                    href={`/api/auth/oauth/${provider}/start?mode=link&returnTo=${encodeURIComponent("/my")}`}
                    className="rounded-full border border-forest/15 bg-white px-4 py-1.5 text-xs font-semibold text-forest hover:bg-cream"
                  >
                    연결하기
                  </a>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
