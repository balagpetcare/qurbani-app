-- Lead workflow: new statuses + case report + status history

-- New workflow statuses (append to existing enum)
ALTER TYPE "LeadStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "LeadStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "LeadStatus" ADD VALUE 'REFERRED';

CREATE TABLE "LeadCaseReport" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "observation" TEXT,
    "doctorAdvice" TEXT,
    "diagnosis" TEXT,
    "treatmentGiven" TEXT,
    "medicineAdvice" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "nextFollowUpAt" TIMESTAMP(3),
    "publicShowcaseEligible" BOOLEAN NOT NULL DEFAULT false,
    "showcaseTitle" TEXT,
    "showcaseSummary" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByDoctorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCaseReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadCaseReport_leadId_key" ON "LeadCaseReport"("leadId");

ALTER TABLE "LeadCaseReport" ADD CONSTRAINT "LeadCaseReport_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadCaseReport" ADD CONSTRAINT "LeadCaseReport_completedByDoctorId_fkey" FOREIGN KEY ("completedByDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LeadStatusHistory" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "fromStatus" "LeadStatus",
    "toStatus" "LeadStatus" NOT NULL,
    "actorKind" TEXT NOT NULL,
    "actorUserId" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadStatusHistory_leadId_idx" ON "LeadStatusHistory"("leadId");

ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
