import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";

const dataDir = "C:/Users/jongh/AppData/Local/Temp/claude/onnest-dev-pg-data";
const alreadyInitialised = existsSync(`${dataDir}/PG_VERSION`);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "onnest",
  password: "onnest",
  port: 5432,
  persistent: true,
});

if (!alreadyInitialised) {
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("onnest");
} catch {
  // already exists
}
console.log("postgres ready on 5432");
