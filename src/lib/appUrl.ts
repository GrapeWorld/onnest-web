const LOCAL_APP_URL = "http://localhost:3000";

export function getAppUrl(
  configured = process.env.APP_URL,
  environment = process.env.NODE_ENV,
) {
  const raw =
    configured?.trim() || (environment === "production" ? "" : LOCAL_APP_URL);
  if (!raw) throw new Error("APP_URL must be configured in production.");

  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("APP_URL must use http or https.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("APP_URL must not contain credentials, a query, or a fragment.");
  }
  if (url.pathname !== "/") {
    throw new Error("APP_URL must be an origin without a path.");
  }

  return url.origin;
}

export function buildResetPasswordUrl(token: string, configured?: string) {
  const url = new URL("/auth/reset-password", getAppUrl(configured));
  url.searchParams.set("token", token);
  return url;
}
