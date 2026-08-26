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
    include: [
      "src/lib/passwordReset.test.ts",
      "src/lib/rateLimit.concurrency.test.ts",
      "src/lib/inquiryLink.test.ts",
      "src/lib/serviceRequestPartnerSnapshot.test.ts",
      "src/lib/partnerInvitation.test.ts",
      "src/lib/adminExport.integration.test.ts",
    ],
    globalSetup: "./vitest.global-setup.ts",
    env: {
      DATABASE_URL: "postgresql://onnest_test:onnest_test@127.0.0.1:54329/onnest_test",
    },
  },
});
