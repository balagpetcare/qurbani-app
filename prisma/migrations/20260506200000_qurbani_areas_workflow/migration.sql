-- CreateEnum: DoctorApplicationStatus
CREATE TYPE "DoctorApplicationStatus" AS ENUM ('NEW', 'REVIEWED', 'APPROVED', 'REJECTED', 'CONVERTED_TO_DOCTOR');

-- Migrate LeadStatus enum values
CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'IN_PROGRESS', 'OBSERVED', 'COMPLETED', 'CANCELLED');

ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Lead"
  ALTER COLUMN "status" TYPE "LeadStatus_new"
  USING (
    CASE "status"::text
      WHEN 'NEW' THEN 'NEW'::"LeadStatus_new"
      WHEN 'COMPLETED' THEN 'COMPLETED'::"LeadStatus_new"
      WHEN 'CANCELLED' THEN 'CANCELLED'::"LeadStatus_new"
      WHEN 'ASSIGNED' THEN 'IN_PROGRESS'::"LeadStatus_new"
      WHEN 'CONTACTED' THEN 'IN_PROGRESS'::"LeadStatus_new"
      WHEN 'VISIT_SCHEDULED' THEN 'OBSERVED'::"LeadStatus_new"
      ELSE 'NEW'::"LeadStatus_new"
    END
  );

DROP TYPE "LeadStatus";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";

ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEW'::"LeadStatus";

-- User.updatedAt
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "User" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Area (seed rows for migration backfill)
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameBn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Area_slug_key" ON "Area"("slug");

INSERT INTO "Area" ("slug", "name", "nameBn", "sortOrder", "createdAt", "updatedAt") VALUES
('onnanno', 'অন্যান্য / Other', 'অন্যান্য', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('mirpur', 'Mirpur', 'মিরপুর', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('uttara', 'Uttara', 'উত্তরা', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rampura', 'Rampura', 'রামপুরা', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('badda', 'Badda', 'বাড্ডা', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('gulshan', 'Gulshan', 'গুলশান', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('banani', 'Banani', 'বনানী', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('mohammadpur', 'Mohammadpur', 'মোহাম্মদপুর', 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('jatrabari', 'Jatrabari', 'যাত্রাবাড়ী', 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('keraniganj', 'Keraniganj', 'কেরানীগঞ্জ', 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('savar-nearby', 'Savar & nearby', 'সাভার ও আশেপাশে', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Lead: new columns (nullable first)
ALTER TABLE "Lead" ADD COLUMN "areaId" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "address" TEXT;
ALTER TABLE "Lead" ADD COLUMN "preferredTime" TEXT;
ALTER TABLE "Lead" ADD COLUMN "serviceRequirement" TEXT;

UPDATE "Lead"
SET
  "serviceRequirement" = COALESCE(NULLIF(TRIM("message"), ''), '(Legacy — no service note)'),
  "areaId" = (SELECT "id" FROM "Area" WHERE "slug" = 'onnanno' LIMIT 1)
WHERE "serviceRequirement" IS NULL OR "areaId" IS NULL;

UPDATE "Lead" SET "areaId" = (SELECT "id" FROM "Area" WHERE "slug" = 'onnanno' LIMIT 1) WHERE "areaId" IS NULL;

ALTER TABLE "Lead" ALTER COLUMN "areaId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "serviceRequirement" SET NOT NULL;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DoctorArea
CREATE TABLE "DoctorArea" (
    "userId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,

    CONSTRAINT "DoctorArea_pkey" PRIMARY KEY ("userId","areaId"),
    CONSTRAINT "DoctorArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoctorArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- DoctorApplication
CREATE TABLE "DoctorApplication" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "experience" TEXT,
    "qualification" TEXT,
    "note" TEXT,
    "status" "DoctorApplicationStatus" NOT NULL DEFAULT 'NEW',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" INTEGER,
    "convertedUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorApplication_convertedUserId_key" ON "DoctorApplication"("convertedUserId");

ALTER TABLE "DoctorApplication" ADD CONSTRAINT "DoctorApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DoctorApplication" ADD CONSTRAINT "DoctorApplication_convertedUserId_fkey" FOREIGN KEY ("convertedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Canonical BD mobile for DoctorApplication (same rules as 20260505193000; runs when table is first created — shadow DB skips DoctorApplication there)
UPDATE "DoctorApplication"
SET phone = '0' || SUBSTRING(phone FROM 4)
WHERE phone ~ '^8801[3-9][0-9]{8}$';

UPDATE "DoctorApplication"
SET whatsapp = '0' || SUBSTRING(whatsapp FROM 4)
WHERE whatsapp IS NOT NULL
  AND whatsapp ~ '^8801[3-9][0-9]{8}$';

-- DoctorApplicationArea
CREATE TABLE "DoctorApplicationArea" (
    "applicationId" INTEGER NOT NULL,
    "areaId" INTEGER NOT NULL,

    CONSTRAINT "DoctorApplicationArea_pkey" PRIMARY KEY ("applicationId","areaId"),
    CONSTRAINT "DoctorApplicationArea_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "DoctorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoctorApplicationArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- LeadObservation
CREATE TABLE "LeadObservation" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "condition" TEXT,
    "note" TEXT,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadObservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadObservation_leadId_idx" ON "LeadObservation"("leadId");
CREATE INDEX "LeadObservation_doctorId_idx" ON "LeadObservation"("doctorId");

ALTER TABLE "LeadObservation" ADD CONSTRAINT "LeadObservation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadObservation" ADD CONSTRAINT "LeadObservation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- LeadAssignment
CREATE TABLE "LeadAssignment" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "assignedByUserId" INTEGER,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadAssignment_leadId_idx" ON "LeadAssignment"("leadId");

ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
