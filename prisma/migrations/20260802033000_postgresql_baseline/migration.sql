-- PostgreSQL baseline. The previous SQLite history is preserved in
-- prisma/migrations-sqlite-legacy and must not be applied to PostgreSQL.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "authVersion" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "termsAgreedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spaceType" TEXT NOT NULL,
    "address" TEXT,
    "moveInDate" TIMESTAMP(3),
    "budget" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "region" TEXT NOT NULL,
    "message" TEXT,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '신규',
    "owner" TEXT,
    "privacyAgreedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCheckItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stepSlug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectCheckItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoverItem" (
    "id" TEXT NOT NULL,
    "handoverId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    CONSTRAINT "HandoverItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectStepState" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '대기',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectStepState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
    "action" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("action","identifier","windowStart")
);

CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "region" TEXT,
    "spaceType" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '신규',
    "owner" TEXT,
    "nextAction" TEXT,
    "privacyAgreedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");
CREATE INDEX "Document_projectId_createdAt_idx" ON "Document"("projectId", "createdAt");
CREATE INDEX "ServiceRequest_status_createdAt_idx" ON "ServiceRequest"("status", "createdAt");
CREATE INDEX "ServiceRequest_projectId_createdAt_idx" ON "ServiceRequest"("projectId", "createdAt");
CREATE INDEX "ProjectEvent_projectId_date_idx" ON "ProjectEvent"("projectId", "date");
CREATE UNIQUE INDEX "ProjectCheckItem_projectId_stepSlug_label_key" ON "ProjectCheckItem"("projectId", "stepSlug", "label");
CREATE UNIQUE INDEX "Handover_projectId_key" ON "Handover"("projectId");
CREATE UNIQUE INDEX "Handover_shareToken_key" ON "Handover"("shareToken");
CREATE UNIQUE INDEX "HandoverItem_handoverId_label_key" ON "HandoverItem"("handoverId", "label");
CREATE UNIQUE INDEX "ProjectStepState_projectId_slug_key" ON "ProjectStepState"("projectId", "slug");
CREATE INDEX "RateLimitHit_action_identifier_createdAt_idx" ON "RateLimitHit"("action", "identifier", "createdAt");
CREATE INDEX "RateLimitHit_createdAt_idx" ON "RateLimitHit"("createdAt");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectEvent" ADD CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectCheckItem" ADD CONSTRAINT "ProjectCheckItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoverItem" ADD CONSTRAINT "HandoverItem_handoverId_fkey" FOREIGN KEY ("handoverId") REFERENCES "Handover"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectStepState" ADD CONSTRAINT "ProjectStepState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
