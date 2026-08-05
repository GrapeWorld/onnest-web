export async function register() {
  // Edge 런타임에서는 이 검증이 필요 없고 process.env 접근 방식도 다르다.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();
  }
}
