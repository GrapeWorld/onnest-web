-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN "privacyAgreedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "termsAgreedAt" DATETIME;
