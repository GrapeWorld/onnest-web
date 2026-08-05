import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

/**
 * 스키마 provider가 postgresql로 고정된 뒤로는 테스트도 실제 Postgres가
 * 있어야 한다(SQLite 파일로는 클라이언트가 아예 연결을 거부한다). Docker 없이도
 * 어디서나 같은 방식으로 돌아가도록, 로컬 앱 개발용 docker-compose Postgres와는
 * 별개로 이 저장소 안에서 완결되는 embedded-postgres를 테스트 전용으로 쓴다.
 * (docker-compose Postgres는 5432, 여기는 54329로 포트를 분리해 둘 다 떠 있어도
 * 충돌하지 않는다.)
 */

const dataDir = fileURLToPath(new URL("./.vitest-postgres-data", import.meta.url));
const port = 54329;
const user = "onnest_test";
const password = "onnest_test";
const database = "onnest_test";
const databaseUrl = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`;

export default async function setup() {
  rmSync(dataDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user,
    password,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(database);

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  return async () => {
    await pg.stop();
    rmSync(dataDir, { recursive: true, force: true });
  };
}
