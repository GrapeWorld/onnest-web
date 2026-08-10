import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    clearMocks: true,
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "e2e/**",
      "src/lib/passwordReset.test.ts",
      "src/lib/rateLimit.concurrency.test.ts",
      "src/lib/inquiryLink.test.ts",
      "src/lib/serviceRequestPartnerSnapshot.test.ts",
      "src/lib/partnerInvitation.test.ts",
    ],
  },
});
