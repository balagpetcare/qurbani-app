-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'FOLLOW_UP_NEEDED';

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_areaId_fkey";

-- AlterTable
ALTER TABLE "ContentReport" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PublicCaseHistory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tutorial" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TutorialRevision" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
