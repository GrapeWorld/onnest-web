-- CreateTable
CREATE TABLE "ProjectPropertySuggestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "transactionType" TEXT,
    "price" INTEGER,
    "deposit" INTEGER,
    "monthlyRent" INTEGER,
    "area" DOUBLE PRECISION,
    "roomCount" INTEGER,
    "availableDate" TIMESTAMP(3),
    "sharedReason" TEXT,
    "cautionNote" TEXT,
    "adminMemo" TEXT,
    "customerStatus" TEXT NOT NULL DEFAULT 'NEW',
    "customerMemo" TEXT,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "savedCandidatePropertyId" TEXT,
    "sharedById" TEXT NOT NULL,
    "sharedByName" TEXT NOT NULL,
    "sharedByEmail" TEXT NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPropertySuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPropertySuggestion_savedCandidatePropertyId_key" ON "ProjectPropertySuggestion"("savedCandidatePropertyId");

-- CreateIndex
CREATE INDEX "ProjectPropertySuggestion_projectId_createdAt_idx" ON "ProjectPropertySuggestion"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectPropertySuggestion_projectId_withdrawnAt_idx" ON "ProjectPropertySuggestion"("projectId", "withdrawnAt");

-- AddForeignKey
ALTER TABLE "ProjectPropertySuggestion" ADD CONSTRAINT "ProjectPropertySuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPropertySuggestion" ADD CONSTRAINT "ProjectPropertySuggestion_savedCandidatePropertyId_fkey" FOREIGN KEY ("savedCandidatePropertyId") REFERENCES "CandidateProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPropertySuggestion" ADD CONSTRAINT "ProjectPropertySuggestion_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
