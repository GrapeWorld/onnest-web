-- AlterTable
ALTER TABLE "User" ADD COLUMN     "memberType" TEXT NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN     "partnerId" TEXT;

-- CreateTable
CREATE TABLE "MemberTypeHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromType" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "fromPartnerId" TEXT,
    "toPartnerId" TEXT,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberTypeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberTypeHistory_userId_createdAt_idx" ON "MemberTypeHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTypeHistory" ADD CONSTRAINT "MemberTypeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: 기존 회원은 모두 CUSTOMER로 안전하게 남는다(컬럼 기본값과 동일).
-- 명시적 UPDATE는 필요 없다 — DEFAULT 'CUSTOMER'가 이미 모든 기존 행에 적용된다.
