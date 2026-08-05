-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "addressPending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contractDate" TIMESTAMP(3),
ADD COLUMN     "details" JSONB,
ADD COLUMN     "projectStage" TEXT,
ADD COLUMN     "scheduleUndecided" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spaceCategory" TEXT,
ADD COLUMN     "transactionType" TEXT;
