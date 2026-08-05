/**
 * 현재 Postgres schema.prisma에서 초기 마이그레이션 SQL을 생성할 수 있는지 검사한다.
 * 실제 DB에 접속하지 않으므로 로컬에 Postgres가 없어도 실행된다.
 * provider가 바뀌거나 스키마가 유효하지 않으면 실패한다.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const schemaPath = "prisma/schema.prisma";
const original = readFileSync(schemaPath, "utf8");

if (!/provider\s*=\s*"postgresql"/.test(original)) {
  console.error("prisma/schema.prisma의 provider는 postgresql이어야 합니다.");
  process.exit(1);
}

try {
  const sql = execSync(
    `npx prisma migrate diff --from-empty --to-schema-datamodel "${schemaPath}" --script`,
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );

  const tables = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]);
  if (process.argv.includes("--print")) {
    console.log(sql);
  } else {
    console.log(`Postgres 이전 가능. 테이블 ${tables.length}개: ${tables.join(", ")}`);
  }
} catch (error) {
  console.error("Postgres용 스키마 생성 실패 — SQLite 전용 구문이 있는지 확인하세요.");
  console.error(error.stdout || error.message);
  process.exit(1);
}
