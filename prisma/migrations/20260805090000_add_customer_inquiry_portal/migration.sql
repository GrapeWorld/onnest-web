-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "satisfactionComment" TEXT,
ADD COLUMN     "satisfactionRating" INTEGER,
ADD COLUMN     "satisfactionSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "InquiryMessage" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderId" TEXT,
    "senderEmail" TEXT,
    "senderName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryLinkToken" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InquiryMessage_inquiryId_createdAt_idx" ON "InquiryMessage"("inquiryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InquiryLinkToken_tokenHash_key" ON "InquiryLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InquiryLinkToken_inquiryId_idx" ON "InquiryLinkToken"("inquiryId");

-- CreateIndex
CREATE INDEX "InquiryLinkToken_userId_idx" ON "InquiryLinkToken"("userId");

-- CreateIndex
CREATE INDEX "Inquiry_userId_idx" ON "Inquiry"("userId");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryMessage" ADD CONSTRAINT "InquiryMessage_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryLinkToken" ADD CONSTRAINT "InquiryLinkToken_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryLinkToken" ADD CONSTRAINT "InquiryLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
