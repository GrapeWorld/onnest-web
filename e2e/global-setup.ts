import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generatePartnerCode } from "../src/lib/partnerCode";
import {
  E2E_ADMIN,
  E2E_PARTNER_NAME,
  E2E_PARTNER_OWNER,
  E2E_PARTNER_SERVICE_TYPE,
  E2E_CUSTOMER,
} from "./fixtures";

/**
 * vitest.global-setup.ts와 같은 패턴 — E2E 전용 embedded-postgres를 이 저장소
 * 안에서 완결되게 띄운다. docker-compose 개발용 DB(5432)·vitest용(54329)과
 * 포트·데이터 디렉토리를 분리해 셋 다 동시에 떠 있어도 충돌하지 않는다.
 */

const dataDir = path.resolve(process.cwd(), ".e2e-postgres-data");
const port = 54331;
const user = "onnest_e2e";
const password = "onnest_e2e";
const database = "onnest_e2e";
export const E2E_DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`;

export default async function globalSetup() {
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
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });

  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });

  try {
    const passwordHash = await bcrypt.hash(E2E_ADMIN.password, 10);

    await prisma.user.create({
      data: {
        email: E2E_ADMIN.email,
        passwordHash,
        name: E2E_ADMIN.name,
        adminRole: "super",
        termsAgreedAt: new Date(),
      },
    });

    const partner = await prisma.partner.create({
      data: {
        name: E2E_PARTNER_NAME,
        serviceType: E2E_PARTNER_SERVICE_TYPE,
        partnerCode: generatePartnerCode(),
      },
    });

    const partnerOwner = await prisma.user.create({
      data: {
        email: E2E_PARTNER_OWNER.email,
        passwordHash,
        name: E2E_PARTNER_OWNER.name,
        memberType: "PARTNER",
        partnerId: partner.id,
        termsAgreedAt: new Date(),
      },
    });

    await prisma.partnerMembership.create({
      data: {
        partnerId: partner.id,
        userId: partnerOwner.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    await prisma.user.create({
      data: {
        email: E2E_CUSTOMER.email,
        passwordHash,
        name: E2E_CUSTOMER.name,
        phone: "010-9000-0002",
        termsAgreedAt: new Date(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  return async () => {
    await pg.stop();
    rmSync(dataDir, { recursive: true, force: true });
  };
}
