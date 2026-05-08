-- Re-append FOLLOW_UP_NEEDED: 20260506200000 recreated "LeadStatus" without this label
-- (20260506090341 added it to the pre-rename enum, which was then dropped).
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_NEEDED';

-- Relax Area FK to match nullable Lead.areaId + Prisma (SET NULL when Area row is removed).
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_areaId_fkey";

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
