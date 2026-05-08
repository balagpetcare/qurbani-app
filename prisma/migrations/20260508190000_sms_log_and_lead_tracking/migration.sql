-- CreateEnum
CREATE TYPE "SmsLogStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "publicTrackingCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_publicTrackingCode_key" ON "Lead"("publicTrackingCode");

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "normalizedPhone" TEXT NOT NULL,
    "messagePreview" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'bulksmsbd',
    "providerCode" TEXT,
    "providerMessage" TEXT,
    "status" "SmsLogStatus" NOT NULL DEFAULT 'PENDING',
    "leadId" INTEGER,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsLog_leadId_idx" ON "SmsLog"("leadId");
CREATE INDEX "SmsLog_normalizedPhone_createdAt_idx" ON "SmsLog"("normalizedPhone", "createdAt");
CREATE INDEX "SmsLog_purpose_createdAt_idx" ON "SmsLog"("purpose", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
