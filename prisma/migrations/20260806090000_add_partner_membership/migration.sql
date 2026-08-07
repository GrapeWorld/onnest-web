-- AlterTable: partnerCode는 기존 행이 있어 nullable로 추가 → 백필 → NOT NULL로 잠근다.
ALTER TABLE "Partner" ADD COLUMN     "partnerCode" TEXT;

UPDATE "Partner"
SET "partnerCode" = 'ONP-' || upper(substr(md5(random()::text || id), 1, 6))
WHERE "partnerCode" IS NULL;

ALTER TABLE "Partner" ALTER COLUMN "partnerCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "PartnerMembership" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "invitedById" TEXT,
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvitation" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerMembership_userId_status_idx" ON "PartnerMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMembership_partnerId_userId_key" ON "PartnerMembership"("partnerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerInvitation_tokenHash_key" ON "PartnerInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "PartnerInvitation_partnerId_email_idx" ON "PartnerInvitation"("partnerId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_partnerCode_key" ON "Partner"("partnerCode");

-- AddForeignKey
ALTER TABLE "PartnerMembership" ADD CONSTRAINT "PartnerMembership_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMembership" ADD CONSTRAINT "PartnerMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvitation" ADD CONSTRAINT "PartnerInvitation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: 기존 memberType='PARTNER' 회원을 ACTIVE 멤버십으로 옮긴다.
-- 업체당 멤버가 정확히 1명이면 OWNER, 그 외엔 전원 STAFF(대표를 자동으로
-- 추측하지 않는다 — 여러 명이면 관리자가 나중에 직접 지정해야 한다).
-- joinedAt은 실제 합류일 이력이 없어 계정 생성일로 근사한다.
INSERT INTO "PartnerMembership" (id, "partnerId", "userId", role, status, "joinedAt", "createdAt", "updatedAt")
SELECT
  'legacy_' || substr(md5(random()::text || u.id || clock_timestamp()::text), 1, 24),
  u."partnerId",
  u.id,
  CASE WHEN cnt.member_count = 1 THEN 'OWNER' ELSE 'STAFF' END,
  'ACTIVE',
  u."createdAt",
  u."createdAt",
  now()
FROM "User" u
JOIN (
  SELECT "partnerId", COUNT(*) AS member_count
  FROM "User"
  WHERE "memberType" = 'PARTNER' AND "partnerId" IS NOT NULL
  GROUP BY "partnerId"
) cnt ON cnt."partnerId" = u."partnerId"
WHERE u."memberType" = 'PARTNER' AND u."partnerId" IS NOT NULL;
