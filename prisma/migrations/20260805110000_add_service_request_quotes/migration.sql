-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "selectedAt" TIMESTAMP(3),
ADD COLUMN     "selectedQuoteId" TEXT;

-- CreateTable
CREATE TABLE "ServiceRequestQuote" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceRequestQuote_serviceRequestId_createdAt_idx" ON "ServiceRequestQuote"("serviceRequestId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_selectedQuoteId_key" ON "ServiceRequest"("selectedQuoteId");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_selectedQuoteId_fkey" FOREIGN KEY ("selectedQuoteId") REFERENCES "ServiceRequestQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestQuote" ADD CONSTRAINT "ServiceRequestQuote_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
