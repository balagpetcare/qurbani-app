-- Doctor application extended intake + admin review note
ALTER TABLE "DoctorApplication" ADD COLUMN "animalExpertise" TEXT;
ALTER TABLE "DoctorApplication" ADD COLUMN "availableTimeText" TEXT;
ALTER TABLE "DoctorApplication" ADD COLUMN "emergencyAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DoctorApplication" ADD COLUMN "ownTransport" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DoctorApplication" ADD COLUMN "expectedVisitCharge" INTEGER;
ALTER TABLE "DoctorApplication" ADD COLUMN "shortBio" TEXT;
ALTER TABLE "DoctorApplication" ADD COLUMN "certificateUrl" TEXT;
ALTER TABLE "DoctorApplication" ADD COLUMN "adminReviewNote" TEXT;

-- NotificationType: new value for doctor applications
ALTER TYPE "NotificationType" ADD VALUE 'DOCTOR_APPLICATION';
