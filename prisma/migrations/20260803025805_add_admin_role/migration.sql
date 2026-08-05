-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminRole" TEXT;

-- CreateTable
CREATE TABLE "AdminRoleHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromRole" TEXT,
    "toRole" TEXT,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRoleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminRoleHistory_userId_createdAt_idx" ON "AdminRoleHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminRoleHistory" ADD CONSTRAINT "AdminRoleHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: role("admin"/"user")과 adminRole(권한 등급)을 분리한다.
-- 기존에 role="admin"이던 계정을 adminRole="super"로 옮기고 role은
-- 서비스 역할 전용 기본값으로 되돌린다. 파괴적 변경이 아니라 값 재배치다.
UPDATE "User" SET "adminRole" = 'super', "role" = 'user' WHERE "role" = 'admin';
