import { NextResponse } from "next/server";
import { isOAuthProvider } from "@/data/oauthProviders";
import { isProviderConfigured } from "@/lib/oauth/providers";
import { getOAuthSession, type OAuthMode } from "@/lib/oauth/session";
import { generateState, generateCodeVerifier, generateNonce } from "@/lib/oauth/pkce";
import { sanitizeReturnTo } from "@/lib/oauth/returnTo";
import { buildAuthorizationUrl, getRedirectUri } from "@/lib/oauth";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const validModes: OAuthMode[] = ["login", "link", "delete-confirm"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params;
  if (!isOAuthProvider(providerParam) || !isProviderConfigured(providerParam)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const provider = providerParam;

  const limit = await checkRateLimit("oauthStart", getClientIp(request));
  if (!limit.ok) {
    return new NextResponse("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", {
      status: 429,
    });
  }

  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  const mode: OAuthMode = validModes.includes(modeParam as OAuthMode)
    ? (modeParam as OAuthMode)
    : "login";
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));

  // 계정 연결·탈퇴 재인증은 이미 로그인한 사용자만 시작할 수 있다.
  let actingUserId: string | undefined;
  if (mode === "link" || mode === "delete-confirm") {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    actingUserId = currentUser.id;
  }

  const state = generateState();
  const redirectUri = getRedirectUri(provider);

  const oauthSession = await getOAuthSession();
  oauthSession.provider = provider;
  oauthSession.mode = mode;
  oauthSession.state = state;
  oauthSession.returnTo = returnTo;
  oauthSession.actingUserId = actingUserId;
  oauthSession.pendingProfile = undefined;

  let codeVerifier: string | undefined;
  let nonce: string | undefined;
  if (provider === "google") {
    codeVerifier = generateCodeVerifier();
    nonce = generateNonce();
    oauthSession.codeVerifier = codeVerifier;
    oauthSession.nonce = nonce;
  } else {
    oauthSession.codeVerifier = undefined;
    oauthSession.nonce = undefined;
  }

  await oauthSession.save();

  const authorizationUrl = buildAuthorizationUrl(provider, {
    redirectUri,
    state,
    codeVerifier,
    nonce,
  });

  return NextResponse.redirect(authorizationUrl);
}
