/**
 * 현재 schema.prisma가 Postgres로 그대로 이전 가능한지 검사한다.
 *
 * provider만 postgresql로 바꾼 사본을 만들어 초기 마이그레이션 SQL을 생성해 본다.
 * 실제 DB에 접속하지 않으므로 로컬에 Postgres가 없어도 실행된다.
 * SQLite 전용 구문을 쓰기 시작하면 여기서 실패한다.
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const schemaPath = "prisma/schema.prisma";
const original = readFileSync(schemaPath, "utf8");

if (!/provider\s*=\s*"sqlite"/.test(original)) {
  console.log("provider가 이미 sqlite가 아닙니다. 검사를 건너뜁니다.");
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "onnest-pg-"));
const target = join(dir, "schema.prisma");
writeFileSync(target, original.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"'));

try {
  const sql = execSync(
    `npx prisma migrate diff --from-empty --to-schema-datamodel "${target}" --script`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  const tables = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]);
  console.log(`Postgres 이전 가능. 테이블 ${tables.length}개: ${tables.join(", ")}`);
} catch (error) {
  console.error("Postgres용 스키마 생성 실패 — SQLite 전용 구문이 있는지 확인하세요.");
  console.error(error.stdout || error.message);
  process.exit(1);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
