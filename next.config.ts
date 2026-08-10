import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E는 로컬 개발 서버(.next-dev)와 동시에 떠도 캐시가 섞이지 않도록 별도 distDir을 쓴다.
  distDir:
    process.env.PW_E2E === "1"
      ? ".next-e2e"
      : process.env.NODE_ENV === "development"
        ? ".next-dev"
        : ".next",
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
