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
      "src/lib/passwordReset.test.ts",
      "src/lib/rateLimit.concurrency.test.ts",
    ],
  },
});
