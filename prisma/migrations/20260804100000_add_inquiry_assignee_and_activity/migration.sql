-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "assigneeId" TEXT;

-- CreateTable
CREATE TABLE "InquiryActivity" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "snapshot" JSONB,
    "note" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InquiryActivity_inquiryId_createdAt_idx" ON "InquiryActivity"("inquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_assigneeId_idx" ON "Inquiry"("assigneeId");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryActivity" ADD CONSTRAINT "InquiryActivity_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: 기존 owner(자유입력 문자열)가 실제 관리자 이메일과 정확히
-- 일치할 때만 assigneeId를 연결한다. 애매한 문자열(오탈자, 이름만 적은 경우
-- 등)은 절대 추측해서 연결하지 않는다 — 잘못된 자동 배정보다는 미배정으로
-- 남기는 쪽이 안전하다.
UPDATE "Inquiry" i
SET "assigneeId" = u."id"
FROM "User" u
WHERE i."owner" = u."email" AND u."adminRole" IS NOT NULL;

-- DataMigration: 기존 문의마다 소급 CREATED 활동을 하나씩 만들어 타임라인의
-- 시작점을 통일한다. 실제 생성자를 알 수 없으므로 actorEmail/actorName을
-- 'SYSTEM_MIGRATION'으로 명확히 표시해 실제 관리자가 남긴 기록과 구분한다.
INSERT INTO "InquiryActivity" ("id", "inquiryId", "action", "snapshot", "note", "actorEmail", "actorName", "createdAt")
SELECT
  gen_random_uuid()::text,
  i."id",
  'CREATED',
  jsonb_build_object(
    'name', i."name",
    'email', i."email",
    'phone', i."phone",
    'type', i."type",
    'region', i."region",
    'spaceType', i."spaceType",
    'message', i."message",
    'organization', i."organization"
  ),
  '기존 데이터 마이그레이션으로 소급 생성된 활동 기록입니다.',
  'SYSTEM_MIGRATION',
  'SYSTEM_MIGRATION',
  i."createdAt"
FROM "Inquiry" i;
