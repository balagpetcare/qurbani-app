-- CreateEnum
CREATE TYPE "SocialAuthProvider" AS ENUM ('GOOGLE', 'FACEBOOK', 'APPLE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CUSTOMER';

UPDATE "User"
SET "phoneVerifiedAt" = COALESCE("updatedAt", NOW())
WHERE "role" = 'CUSTOMER' AND "phone" IS NOT NULL;

-- CreateTable
CREATE TABLE "CustomerSocialLink" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" "SocialAuthProvider" NOT NULL,
    "providerSubject" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSocialLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerSocialLink_provider_providerSubject_key" ON "CustomerSocialLink"("provider", "providerSubject");

CREATE UNIQUE INDEX "CustomerSocialLink_userId_provider_key" ON "CustomerSocialLink"("userId", "provider");

CREATE INDEX "CustomerSocialLink_userId_idx" ON "CustomerSocialLink"("userId");

ALTER TABLE "CustomerSocialLink" ADD CONSTRAINT "CustomerSocialLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
