-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category" TEXT,
ADD COLUMN     "serviceRequestId" TEXT,
ADD COLUMN     "uploadedById" TEXT,
ADD COLUMN     "uploadedByName" TEXT,
ADD COLUMN     "uploadedByRole" TEXT NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "partnerStaffId" TEXT;

-- CreateTable
CREATE TABLE "ServiceRequestActivity" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "note" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequestActivity_serviceRequestId_createdAt_idx" ON "ServiceRequestActivity"("serviceRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_serviceRequestId_createdAt_idx" ON "Document"("serviceRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_partnerId_createdAt_idx" ON "ServiceRequest"("partnerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_partnerStaffId_fkey" FOREIGN KEY ("partnerStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestActivity" ADD CONSTRAINT "ServiceRequestActivity_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: ServiceRequest.status를 기존 4단계에서 새 7단계 업체 처리
-- 워크플로로 옮긴다. "파트너 연결"은 새 모델에서는 "업체가 아직 확인하지
-- 않은 신규 배정 건"과 같은 뜻이라 "신규"로, "완료"는 "작업 완료"로,
-- "상담 중"은 "확인 중"으로 옮긴다. "신규"는 그대로 둔다.
UPDATE "ServiceRequest" SET "status" = '확인 중' WHERE "status" = '상담 중';
UPDATE "ServiceRequest" SET "status" = '신규' WHERE "status" = '파트너 연결';
UPDATE "ServiceRequest" SET "status" = '작업 완료' WHERE "status" = '완료';
