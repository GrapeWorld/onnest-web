-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "noPartnerNoticeSentAt" TIMESTAMP(3),
ADD COLUMN     "noPartnerReason" TEXT;
