-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "partnerId" TEXT;

-- AlterTable
ALTER TABLE "ServiceRequestActivity" ADD COLUMN     "partnerId" TEXT;

-- Backfill: 기존 행을 "현재 배정된 업체" 기준으로 채운다. 이미 재배정된
-- 적이 있는 건은 그 과거 이력이 이 백필 시점에 한해 부정확하게 남지만
-- (과거 데이터라 되돌릴 수 없다), 이후의 모든 신규 재배정부터는 정확히
-- 막힌다. 백필하지 않으면 현재 정상 배정된 업체까지 자기 기록을 못 본다.
UPDATE "ServiceRequestActivity" a
SET "partnerId" = sr."partnerId"
FROM "ServiceRequest" sr
WHERE a."serviceRequestId" = sr.id AND a."partnerId" IS NULL;

UPDATE "Document" d
SET "partnerId" = sr."partnerId"
FROM "ServiceRequest" sr
WHERE d."serviceRequestId" = sr.id AND d."partnerId" IS NULL;
