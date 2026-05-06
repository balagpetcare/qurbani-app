-- CreateEnum
CREATE TYPE "DoctorAreaPreferenceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "availabilityStatus" TEXT,
ADD COLUMN     "availableTimeText" TEXT,
ADD COLUMN     "experienceSummary" TEXT,
ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifySms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifyWhatsApp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "shortBio" TEXT;

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "group" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAreaPreferenceRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestedAreaIds" JSONB NOT NULL,
    "status" "DoctorAreaPreferenceStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAreaPreferenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateIndex
CREATE INDEX "SiteSetting_group_idx" ON "SiteSetting"("group");

-- CreateIndex
CREATE INDEX "DoctorAreaPreferenceRequest_userId_status_idx" ON "DoctorAreaPreferenceRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "DoctorAreaPreferenceRequest" ADD CONSTRAINT "DoctorAreaPreferenceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
