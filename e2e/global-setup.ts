import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import os from "node:os";
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
 *
 * 데이터 디렉토리는 프로젝트 루트가 아니라 OS 임시 디렉토리에 둔다 — 이
 * 임베디드 Postgres는 이 스위트가 띄우는 실제 `next dev`(webServer)와 같은
 * 프로젝트 루트를 공유하는데, WAL·임시 파일 쓰기가 매우 잦아 프로젝트
 * 루트 안에 있으면 next dev의 파일 워처가 이를 소스 변경으로 오인해
 * 불필요한 재컴파일/무효화를 유발할 수 있다(전체 스위트 실행 중 관찰된
 * 산발적 ECONNRESET/응답 지연과 상관관계가 있어 보여, 근본적으로 워처가
 * 볼 필요가 없는 이 데이터를 아예 감시 범위 밖으로 옮긴다).
 */

const dataDir = path.join(os.tmpdir(), "onnest-e2e-postgres-data");
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
        // 신규 업체 기본값은 PENDING(검토 대기)이지만, 이 시드 업체는 기존
        // E2E 스펙 전체가 "이미 배정 가능한 업체"로 전제하고 있어 APPROVED로
        // 만든다. 검증 게이트 자체는 service-request-lifecycle.spec.ts가
        // 별도로 PENDING 업체를 만들어 검증한다.
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
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
