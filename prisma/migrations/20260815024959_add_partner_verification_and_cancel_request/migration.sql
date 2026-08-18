-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "verificationReason" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "verifiedByName" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "cancelRequestReason" TEXT,
ADD COLUMN     "cancelRequestedAt" TIMESTAMP(3);

-- Backfill: 업체 등록 API 자체가 super admin 전용이라, 이 마이그레이션
-- 이전에 만들어진 업체는 이미 관리자가 직접 입력해 사실상 검증을 거친
-- 상태다. 새 PENDING 기본값을 그대로 적용하면 이미 배정·운영 중이던
-- 업체가 갑자기 배정 불가 상태가 되므로, 이 시점에 이미 존재하던 업체만
-- APPROVED로 소급 적용한다. 이후 새로 등록되는 업체는 스키마 기본값대로
-- PENDING부터 시작해 관리자의 명시적 승인을 거친다.
UPDATE "Partner" SET "verificationStatus" = 'APPROVED', "verifiedAt" = "createdAt" WHERE "verificationStatus" = 'PENDING';

-- CreateTable
CREATE TABLE "PartnerVerificationHistory" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerVerificationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerVerificationHistory_partnerId_createdAt_idx" ON "PartnerVerificationHistory"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "Partner_verificationStatus_idx" ON "Partner"("verificationStatus");

-- AddForeignKey
ALTER TABLE "PartnerVerificationHistory" ADD CONSTRAINT "PartnerVerificationHistory_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
