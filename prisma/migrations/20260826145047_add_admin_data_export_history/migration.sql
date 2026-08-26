-- CreateTable
CREATE TABLE "AdminDataExportHistory" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "customerId" TEXT,
    "projectId" TEXT,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "includedSections" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "rowCount" INTEGER,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL,
    "failureReasonCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AdminDataExportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminDataExportHistory_actorId_createdAt_idx" ON "AdminDataExportHistory"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminDataExportHistory_customerId_createdAt_idx" ON "AdminDataExportHistory"("customerId", "createdAt");
