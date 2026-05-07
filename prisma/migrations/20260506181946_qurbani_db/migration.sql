-- AlterEnum
-- ALTER TYPE "LeadStatus" ADD VALUE 'FOLLOW_UP_NEEDED';

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_areaId_fkey";
