-- Tutorial + moderation MVP (revisions, content reports, user blocks).

CREATE TYPE "TutorialStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED');

CREATE TYPE "ModerationTargetType" AS ENUM ('TUTORIAL', 'TUTORIAL_COMMENT', 'PUBLIC_CASE_HISTORY');

CREATE TYPE "ContentReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'MISINFORMATION', 'COPYRIGHT', 'OTHER');

CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED_DISMISSED', 'RESOLVED_ACTION_TAKEN');

CREATE TABLE "Tutorial" (
    "id" SERIAL NOT NULL,
    "authorUserId" INTEGER NOT NULL,
    "status" "TutorialStatus" NOT NULL DEFAULT 'DRAFT',
    "currentRevisionId" INTEGER,
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

    CONSTRAINT "Tutorial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TutorialRevision" (
    "id" SERIAL NOT NULL,
    "tutorialId" INTEGER NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "titleBn" TEXT NOT NULL,
    "summaryBn" TEXT,
    "bodyBn" TEXT,
    "videoUrl" TEXT NOT NULL,
    "posterImageUrl" TEXT,
    "durationSec" INTEGER,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorialRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tutorial_currentRevisionId_key" ON "Tutorial"("currentRevisionId");

CREATE INDEX "Tutorial_status_publishedAt_idx" ON "Tutorial"("status", "publishedAt" DESC);

CREATE INDEX "Tutorial_authorUserId_status_idx" ON "Tutorial"("authorUserId", "status");

CREATE INDEX "TutorialRevision_tutorialId_idx" ON "TutorialRevision"("tutorialId");

CREATE UNIQUE INDEX "TutorialRevision_tutorialId_revisionNumber_key" ON "TutorialRevision"("tutorialId", "revisionNumber");

ALTER TABLE "Tutorial" ADD CONSTRAINT "Tutorial_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Tutorial" ADD CONSTRAINT "Tutorial_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TutorialRevision" ADD CONSTRAINT "TutorialRevision_tutorialId_fkey" FOREIGN KEY ("tutorialId") REFERENCES "Tutorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TutorialRevision" ADD CONSTRAINT "TutorialRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Tutorial" ADD CONSTRAINT "Tutorial_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "TutorialRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ContentReport" (
    "id" SERIAL NOT NULL,
    "reporterUserId" INTEGER NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" "ContentReportReason" NOT NULL,
    "details" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAdminUserId" INTEGER,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserBlock" (
    "id" SERIAL NOT NULL,
    "blockerUserId" INTEGER NOT NULL,
    "blockedUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContentReport_targetType_targetId_idx" ON "ContentReport"("targetType", "targetId");

CREATE INDEX "ContentReport_reporterUserId_createdAt_idx" ON "ContentReport"("reporterUserId", "createdAt");

CREATE INDEX "ContentReport_status_idx" ON "ContentReport"("status");

ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "UserBlock_blockerUserId_blockedUserId_key" ON "UserBlock"("blockerUserId", "blockedUserId");

CREATE INDEX "UserBlock_blockerUserId_idx" ON "UserBlock"("blockerUserId");

CREATE INDEX "UserBlock_blockedUserId_idx" ON "UserBlock"("blockedUserId");

ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
