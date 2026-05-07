-- Public anonymized case history MVP (admin approval; no customer PII columns).

CREATE TYPE "PublicCaseHistoryStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED');

CREATE TABLE "PublicCaseHistory" (
    "id" SERIAL NOT NULL,
    "sourceLeadId" INTEGER NOT NULL,
    "sourceCaseReportId" INTEGER,
    "authorDoctorUserId" INTEGER NOT NULL,
    "status" "PublicCaseHistoryStatus" NOT NULL DEFAULT 'DRAFT',
    "titleBn" TEXT NOT NULL,
    "summaryBn" TEXT,
    "bodyBn" TEXT,
    "animalKind" "AnimalKind",
    "animalTypeLabelBn" TEXT,
    "problemSummaryBn" TEXT NOT NULL,
    "diagnosisSummaryBn" TEXT,
    "treatmentSummaryBn" TEXT,
    "resultSummaryBn" TEXT,
    "areaBucket" TEXT NOT NULL,
    "mediaUrls" TEXT,
    "posterImageUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "reviewedByUserId" INTEGER,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicCaseHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicCaseHistory_sourceLeadId_key" ON "PublicCaseHistory"("sourceLeadId");

CREATE UNIQUE INDEX "PublicCaseHistory_sourceCaseReportId_key" ON "PublicCaseHistory"("sourceCaseReportId");

CREATE INDEX "PublicCaseHistory_status_publishedAt_idx" ON "PublicCaseHistory"("status", "publishedAt" DESC);

CREATE INDEX "PublicCaseHistory_authorDoctorUserId_status_idx" ON "PublicCaseHistory"("authorDoctorUserId", "status");

ALTER TABLE "PublicCaseHistory" ADD CONSTRAINT "PublicCaseHistory_sourceLeadId_fkey" FOREIGN KEY ("sourceLeadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicCaseHistory" ADD CONSTRAINT "PublicCaseHistory_sourceCaseReportId_fkey" FOREIGN KEY ("sourceCaseReportId") REFERENCES "LeadCaseReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublicCaseHistory" ADD CONSTRAINT "PublicCaseHistory_authorDoctorUserId_fkey" FOREIGN KEY ("authorDoctorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublicCaseHistory" ADD CONSTRAINT "PublicCaseHistory_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
