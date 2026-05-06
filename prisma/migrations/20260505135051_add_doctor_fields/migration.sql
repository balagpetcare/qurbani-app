-- AlterTable
ALTER TABLE "User" ADD COLUMN     "areaCoverage" TEXT,
ADD COLUMN     "emergencyAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "whatsapp" TEXT;
