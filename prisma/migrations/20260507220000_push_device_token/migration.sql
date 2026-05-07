-- Mobile FCM device registrations (doctor + customer apps).
CREATE TYPE "PushDevicePlatform" AS ENUM ('ANDROID', 'IOS');

CREATE TABLE "PushDeviceToken" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "platform" "PushDevicePlatform" NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PushDeviceToken_token_key" UNIQUE ("token"),
    CONSTRAINT "PushDeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PushDeviceToken_userId_idx" ON "PushDeviceToken"("userId");
