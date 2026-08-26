-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paymentTier" TEXT NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "PaymentTierHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromTier" TEXT NOT NULL,
    "toTier" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTierHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentTierHistory_userId_createdAt_idx" ON "PaymentTierHistory"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentTierHistory" ADD CONSTRAINT "PaymentTierHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
