import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      ".next/**",
      ".next-dev/**",
      "out/**",
      "node_modules/**",
      "src/generated/**",
      "prisma/migrations/**",
      // Next가 자동 생성하며 "should not be edited"라고 명시된 파일
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // API 응답 본문 등 외부 입력을 다루는 지점에서는 any가 불가피한 경우가 있어 경고로 둔다.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
