"use client";

import { useState } from "react";
import { oauthProviders, oauthProviderLabels, type OAuthProvider } from "@/data/oauthProviders";

const providerStyle: Record<OAuthProvider, string> = {
  kakao: "bg-[#FEE500] text-[#191600] hover:brightness-95",
  naver: "bg-[#03C75A] text-white hover:brightness-95",
  google: "border border-forest/15 bg-white text-[#4285F4] hover:bg-cream",
};

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "kakao") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M12 4.25c-5.1 0-9.25 3.18-9.25 7.1 0 2.52 1.73 4.74 4.34 6l-1.1 3.36a.55.55 0 0 0 .81.64l3.91-2.59c.42.05.85.08 1.29.08 5.1 0 9.25-3.18 9.25-7.1S17.1 4.25 12 4.25Z" />
      </svg>
    );
  }

  if (provider === "naver") {
    return <span aria-hidden="true" className="text-lg font-black leading-none">N</span>;
  }

  return <span aria-hidden="true" className="text-lg font-bold leading-none">G</span>;
}

export function SocialLoginButtons({
  configuredProviders,
  returnTo,
}: {
  configuredProviders: OAuthProvider[];
  returnTo?: string;
}) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const visibleProviders = oauthProviders.filter((provider) =>
    configuredProviders.includes(provider),
  );

  if (visibleProviders.length === 0) return null;

  function handleClick(provider: OAuthProvider, event: React.MouseEvent) {
    // 로딩 중 중복 클릭을 막는다 — 전체 페이지 이동이라 href 자체는 그대로 두고
    // 이미 한 번 눌렀으면 추가 클릭만 무시한다.
    if (pending) {
      event.preventDefault();
      return;
    }
    setPending(provider);
  }

  return (
    <div className="grid w-full min-w-0 gap-4">
      <div className="flex min-w-0 items-center gap-3 text-xs text-ink/45">
        <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-forest/10" />
        <span>소셜 계정으로 로그인</span>
        <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-forest/10" />
      </div>

      <div className="flex min-w-0 flex-wrap items-start justify-center gap-5 sm:gap-7">
        {visibleProviders.map((provider) => {
          const href = `/api/auth/oauth/${provider}/start${
            returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
          }`;
          return (
            <a
              key={provider}
              href={href}
              onClick={(event) => handleClick(provider, event)}
              aria-disabled={pending !== null}
              aria-label={`${oauthProviderLabels[provider]} 계정으로 로그인`}
              title={`${oauthProviderLabels[provider]} 계정으로 로그인`}
              className={`group inline-flex min-w-11 flex-col items-center gap-1.5 rounded-xl text-xs font-semibold text-ink/60 transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 ${
                pending && pending !== provider ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-soft transition group-hover:-translate-y-0.5 group-hover:shadow-glow ${providerStyle[provider]}`}
              >
                <ProviderIcon provider={provider} />
              </span>
              <span aria-hidden="true">{oauthProviderLabels[provider]}</span>
            </a>
          );
        })}
      </div>

      <p aria-live="polite" className="min-h-5 text-center text-xs font-semibold text-forest/70">
        {pending ? `${oauthProviderLabels[pending]} 로그인으로 이동 중...` : ""}
      </p>
    </div>
  );
}
