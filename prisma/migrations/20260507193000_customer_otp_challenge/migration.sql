-- Safe enum extension: new app-only role (no backfill required).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CUSTOMER';

-- One-time mobile customer OTP challenges (hashed code only).
CREATE TABLE "CustomerOtpChallenge" (
    "id" TEXT NOT NULL,
    "phoneCanon" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerOtpChallenge_phoneCanon_createdAt_idx" ON "CustomerOtpChallenge"("phoneCanon", "createdAt");

-- Speed up "my requests" by phone (canonical local 01… as stored on Lead).
CREATE INDEX "Lead_phone_createdAt_idx" ON "Lead"("phone", "createdAt");
