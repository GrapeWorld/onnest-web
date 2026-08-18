-- CreateTable
CREATE TABLE "CandidateProperty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
    "memo" TEXT,
    "advantages" TEXT,
    "concerns" TEXT,
    "status" TEXT NOT NULL DEFAULT '관심',
    "selectedAt" TIMESTAMP(3),
    "linkedProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyVisitCheckItem" (
    "id" TEXT NOT NULL,
    "candidatePropertyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyVisitCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "desiredRegion" TEXT,
    "transactionType" TEXT,
    "minBudget" INTEGER,
    "maxBudget" INTEGER,
    "minArea" DOUBLE PRECISION,
    "minRooms" INTEGER,
    "desiredMoveInDate" TIMESTAMP(3),
    "mustHave" TEXT,
    "niceToHave" TEXT,
    "commuteMemo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProperty_linkedProjectId_key" ON "CandidateProperty"("linkedProjectId");

-- CreateIndex
CREATE INDEX "CandidateProperty_userId_createdAt_idx" ON "CandidateProperty"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CandidateProperty_userId_status_idx" ON "CandidateProperty"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyVisitCheckItem_candidatePropertyId_label_key" ON "PropertyVisitCheckItem"("candidatePropertyId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPreference_userId_key" ON "PropertyPreference"("userId");

-- AddForeignKey
ALTER TABLE "CandidateProperty" ADD CONSTRAINT "CandidateProperty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProperty" ADD CONSTRAINT "CandidateProperty_linkedProjectId_fkey" FOREIGN KEY ("linkedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyVisitCheckItem" ADD CONSTRAINT "PropertyVisitCheckItem_candidatePropertyId_fkey" FOREIGN KEY ("candidatePropertyId") REFERENCES "CandidateProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPreference" ADD CONSTRAINT "PropertyPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
