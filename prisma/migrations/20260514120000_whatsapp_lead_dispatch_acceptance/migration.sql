-- WhatsApp manual dispatch + secure acceptance (Quarbani 2026)

ALTER TABLE "Lead" ADD COLUMN "acceptanceToken" VARCHAR(64);
ALTER TABLE "Lead" ADD COLUMN "whatsappCopiedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "acceptanceLinkOpenedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN "leadCompletedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Lead_acceptanceToken_key" ON "Lead"("acceptanceToken");

CREATE TABLE "LeadWhatsAppCopyLog" (
    "id" TEXT NOT NULL,
    "leadId" INTEGER NOT NULL,
    "adminUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(512),

    CONSTRAINT "LeadWhatsAppCopyLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadWhatsAppCopyLog_leadId_createdAt_idx" ON "LeadWhatsAppCopyLog"("leadId", "createdAt");

ALTER TABLE "LeadWhatsAppCopyLog" ADD CONSTRAINT "LeadWhatsAppCopyLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadWhatsAppCopyLog" ADD CONSTRAINT "LeadWhatsAppCopyLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
