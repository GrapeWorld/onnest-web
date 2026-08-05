import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isOAuthProvider } from "@/data/oauthProviders";
import { isProviderConfigured } from "@/lib/oauth/providers";
import { getOAuthSession } from "@/lib/oauth/session";
import { timingSafeEqualString } from "@/lib/oauth/pkce";
import { completeOAuthExchange, getRedirectUri } from "@/lib/oauth";
import type { NormalizedProfile } from "@/lib/oauth/types";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { loginBlockedStatuses } from "@/data/memberStatus";

function loginErrorRedirect(request: Request, code: string) {
  const url = new URL("/auth/login", request.url);
  url.searchParams.set("oauthError", code);
  return NextResponse.redirect(url);
}

function safeInternalRedirect(request: Request, path: string) {
  const url = new URL(path, request.url);
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params;
  if (!isOAuthProvider(providerParam) || !isProviderConfigured(providerParam)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const provider = providerParam;

  const limit = await checkRateLimit("oauthCallback", getClientIp(request));
  if (!limit.ok) {
    return loginErrorRedirect(request, "rate_limited");
  }

  const oauthSession = await getOAuthSession();
  const {
    state: expectedState,
    codeVerifier,
    nonce,
    mode,
    returnTo,
    actingUserId,
    provider: sessionProvider,
  } = oauthSession;

  const url = new URL(request.url);
  const providerError = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // state·PKCE·nonce는 1회용이다 — 요청을 더 처리하기 전에 세션을 지워
  // 같은 callback URL을 다시 열어도(재생 공격) 더는 통과하지 못하게 한다.
  await oauthSession.destroy();

  if (providerError) {
    return loginErrorRedirect(request, "cancelled");
  }
  if (!code || !state || !expectedState) {
    return loginErrorRedirect(request, "expired");
  }
  if (sessionProvider !== provider) {
    return loginErrorRedirect(request, "invalid_state");
  }
  if (!timingSafeEqualString(state, expectedState)) {
    return loginErrorRedirect(request, "invalid_state");
  }

  let profile: NormalizedProfile;
  try {
    profile = await completeOAuthExchange(provider, {
      code,
      redirectUri: getRedirectUri(provider),
      codeVerifier,
      state,
      nonce,
    });
  } catch (error) {
    console.error(`[oauth] ${provider} exchange failed`, error);
    return loginErrorRedirect(request, "provider_error");
  }

  const safeReturnTo = returnTo || "/my";

  // ---- 탈퇴 재인증: 이미 로그인된 사용자가 본인 계정에 연결된 provider로
  // 다시 인증한 경우에만 짧은 수명의 삭제 승인 상태를 세션에 남긴다.
  if (mode === "delete-confirm") {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== actingUserId) {
      return loginErrorRedirect(request, "reauth_failed");
    }
    const linked = await prisma.socialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      select: { userId: true },
    });
    if (!linked || linked.userId !== currentUser.id) {
      return loginErrorRedirect(request, "reauth_failed");
    }

    const realSession = await getSession();
    realSession.deleteApprovedAt = Date.now();
    await realSession.save();
    return safeInternalRedirect(request, `${safeReturnTo}?deleteApproved=1`);
  }

  // ---- 계정 연결: 로그인 상태에서 명시적으로 요청한 흐름만 연결을 만든다.
  if (mode === "link") {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id !== actingUserId) {
      return loginErrorRedirect(request, "reauth_failed");
    }

    const existing = await prisma.socialAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      select: { userId: true },
    });
    if (existing && existing.userId !== currentUser.id) {
      return loginErrorRedirect(request, "already_linked");
    }
    if (existing) {
      // 이미 본인에게 연결돼 있다 — 그대로 성공 처리한다(멱등).
      return safeInternalRedirect(request, `${safeReturnTo}?linked=1`);
    }

    let updatedUser: { authVersion: number };
    try {
      updatedUser = await prisma.$transaction(async (tx) => {
        await tx.socialAccount.create({
          data: {
            userId: currentUser.id,
            provider,
            providerAccountId: profile.providerAccountId,
            providerEmail: profile.email,
            emailVerified: profile.emailVerified,
          },
        });
        // 로그인 방법이 늘어나는 보안 관련 변경이므로 다른 곳의 기존 세션은
        // 무효화한다 — authVersion을 올리고, 지금 이 요청의 세션에도 새 값을
        // 즉시 반영해 본인이 스스로 로그아웃되지 않게 한다.
        return tx.user.update({
          where: { id: currentUser.id },
          data: { authVersion: { increment: 1 } },
          select: { authVersion: true },
        });
      });
    } catch (error) {
      // 동시에 같은 provider 계정을 연결하려던 두 요청이 경합하면(둘 다 위의
      // findUnique 조회는 통과했지만) DB의 @@unique 제약이 뒤늦게 막는다.
      // 그 경우도 서버 에러 대신 같은 안내로 처리한다.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return loginErrorRedirect(request, "already_linked");
      }
      throw error;
    }

    const realSession = await getSession();
    realSession.userId = currentUser.id;
    realSession.authVersion = updatedUser.authVersion;
    await realSession.save();

    return safeInternalRedirect(request, `${safeReturnTo}?linked=1`);
  }

  // ---- 로그인/가입
  const existingSocialAccount = await prisma.socialAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    select: {
      userId: true,
      user: { select: { id: true, authVersion: true, status: true } },
    },
  });

  if (existingSocialAccount) {
    const { user } = existingSocialAccount;
    if (loginBlockedStatuses.includes(user.status as (typeof loginBlockedStatuses)[number])) {
      // 계정 상태를 구체적으로 노출하지 않는다 — 일반 로그인 실패와 같은 문구.
      return loginErrorRedirect(request, "login_failed");
    }

    await prisma.socialAccount.update({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
      data: { providerEmail: profile.email, emailVerified: profile.emailVerified },
    });

    const realSession = await getSession();
    realSession.userId = user.id;
    realSession.authVersion = user.authVersion;
    await realSession.save();

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return safeInternalRedirect(request, safeReturnTo);
  }

  // 신규 provider 계정이다. 같은 이메일의 기존(이메일·비밀번호) 계정이
  // 있어도 이메일만으로는 절대 자동 연결하지 않는다 — 계정 탈취 방지 P0.
  if (profile.email) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true },
    });
    if (existingEmailUser) {
      return loginErrorRedirect(request, "account_conflict");
    }
  }

  if (!profile.email || !profile.emailVerified) {
    return loginErrorRedirect(request, "email_unverified");
  }

  // 신규 가입 완료 페이지로 넘긴다 — provider 정보만으로 User를 바로 만들지 않는다.
  const completeSession = await getOAuthSession();
  completeSession.provider = provider;
  completeSession.mode = "login";
  completeSession.returnTo = safeReturnTo;
  completeSession.pendingProfile = profile;
  await completeSession.save();

  return safeInternalRedirect(request, "/auth/oauth/complete");
}
