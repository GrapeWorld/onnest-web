-- AlterTable
ALTER TABLE "Handover" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderationReason" TEXT,
ADD COLUMN     "moderationStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "moderatorEmail" TEXT,
ADD COLUMN     "moderatorId" TEXT;

-- CreateTable
CREATE TABLE "HandoverModerationHistory" (
    "id" TEXT NOT NULL,
    "handoverId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HandoverModerationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HandoverModerationHistory_handoverId_createdAt_idx" ON "HandoverModerationHistory"("handoverId", "createdAt");

-- AddForeignKey
ALTER TABLE "HandoverModerationHistory" ADD CONSTRAINT "HandoverModerationHistory_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "Handover"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: 이미 공유 중(visibility='link')이던 기존 인수인계서는
-- 검수 없이 "approved"로 이관해 기존 공유 링크가 즉시 깨지지 않게 한다.
-- 비공개 상태였던 행은 컬럼 기본값(pending)을 그대로 둔다 — 아직 공유되지
-- 않았으니 급하게 검수할 필요가 없다.
UPDATE "Handover" SET "moderationStatus" = 'approved' WHERE "visibility" = 'link';
