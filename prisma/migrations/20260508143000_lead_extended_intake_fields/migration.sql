-- Lead intake extensions (Q26-CMD-04): priority, animal kind, triage flags, map/media URLs, contact preference.

CREATE TYPE "LeadPriority" AS ENUM ('NORMAL', 'URGENT', 'EMERGENCY');
CREATE TYPE "AnimalKind" AS ENUM ('CATTLE', 'GOAT', 'SHEEP', 'BUFFALO', 'OTHER');
CREATE TYPE "LeadContactPreference" AS ENUM ('CALL', 'WHATSAPP', 'VISIT');

ALTER TABLE "Lead" ADD COLUMN "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Lead" ADD COLUMN "animalKind" "AnimalKind";
ALTER TABLE "Lead" ADD COLUMN "approxAgeText" TEXT;
ALTER TABLE "Lead" ADD COLUMN "approxWeightKg" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "problemCategory" TEXT;
ALTER TABLE "Lead" ADD COLUMN "problemDuration" TEXT;
ALTER TABLE "Lead" ADD COLUMN "eatingStatus" TEXT;
ALTER TABLE "Lead" ADD COLUMN "feverSuspected" BOOLEAN;
ALTER TABLE "Lead" ADD COLUMN "bellyBloated" BOOLEAN;
ALTER TABLE "Lead" ADD COLUMN "canWalk" BOOLEAN;
ALTER TABLE "Lead" ADD COLUMN "problemDetails" TEXT;
ALTER TABLE "Lead" ADD COLUMN "preferredContact" "LeadContactPreference";
ALTER TABLE "Lead" ADD COLUMN "googleMapUrl" TEXT;
ALTER TABLE "Lead" ADD COLUMN "mediaUrls" TEXT;

CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");
