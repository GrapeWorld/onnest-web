"use client";

import { useState } from "react";
import { oauthProviders, oauthProviderLabels, type OAuthProvider } from "@/data/oauthProviders";

/**
 * 각 provider의 대표색만 반영한 자리표시자 아이콘이다. 공식 브랜드 가이드의
 * 로고 에셋(SVG)은 이 샌드박스에서 외부 파일을 받아올 수 없어 넣지 못했다
 * — 실제 배포 전에 각 provider의 브랜드 리소스 킷에서 정식 로고로 교체해야 한다.
 */
const providerStyle: Record<OAuthProvider, string> = {
  kakao: "bg-[#FEE500] text-[#191600] hover:brightness-95",
  naver: "bg-[#03C75A] text-white hover:brightness-95",
  google: "border border-forest/15 bg-white text-ink hover:bg-cream",
};

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
    <div className="grid w-full min-w-0 gap-3">
      <div className="grid min-w-0 gap-2">
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
              className={`box-border inline-flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-soft transition ${providerStyle[provider]} ${
                pending && pending !== provider ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {pending === provider
                ? "이동 중..."
                : `${oauthProviderLabels[provider]}로 시작하기`}
            </a>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-xs text-ink/40">
        <span className="h-px flex-1 bg-forest/10" />
        또는
        <span className="h-px flex-1 bg-forest/10" />
      </div>
    </div>
  );
}
