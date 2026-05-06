-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "isPossibleDuplicate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "duplicateOfLeadId" INTEGER;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_duplicateOfLeadId_fkey" FOREIGN KEY ("duplicateOfLeadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
