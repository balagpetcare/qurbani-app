-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BKASH', 'NAGAD', 'BANK', 'ONLINE', 'MIXED', 'DUE');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('UNSETTLED', 'PENDING_REVIEW', 'APPROVED', 'PAID_TO_PLATFORM', 'PAID_TO_DOCTOR', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TreatmentCompletionStatus" AS ENUM ('COMPLETED', 'FOLLOW_UP_NEEDED', 'REFERRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "LeadCaseBilling" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "doctorId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "status" "TreatmentCompletionStatus" NOT NULL DEFAULT 'COMPLETED',
    "observation" TEXT,
    "diagnosis" TEXT,
    "treatmentNote" TEXT,
    "medicinesUsed" TEXT,
    "medicineLines" JSONB,
    "serviceFee" INTEGER NOT NULL DEFAULT 0,
    "medicineCharge" INTEGER NOT NULL DEFAULT 0,
    "transportCharge" INTEGER NOT NULL DEFAULT 0,
    "emergencyCharge" INTEGER NOT NULL DEFAULT 0,
    "otherCharge" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" INTEGER NOT NULL DEFAULT 0,
    "totalCollected" INTEGER NOT NULL DEFAULT 0,
    "dueAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "commissionableAmount" INTEGER NOT NULL DEFAULT 0,
    "platformCommissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformCommissionAmount" INTEGER NOT NULL DEFAULT 0,
    "doctorEarningAmount" INTEGER NOT NULL DEFAULT 0,
    "doctorPayableToPlatform" INTEGER NOT NULL DEFAULT 0,
    "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'UNSETTLED',
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpAt" TIMESTAMP(3),
    "invoiceNo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCaseBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadCaseBilling_leadId_key" ON "LeadCaseBilling"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadCaseBilling_invoiceNo_key" ON "LeadCaseBilling"("invoiceNo");

-- CreateIndex
CREATE INDEX "LeadCaseBilling_doctorId_idx" ON "LeadCaseBilling"("doctorId");

-- CreateIndex
CREATE INDEX "LeadCaseBilling_doctorId_completedAt_idx" ON "LeadCaseBilling"("doctorId", "completedAt");

-- CreateIndex
CREATE INDEX "LeadCaseBilling_settlementStatus_idx" ON "LeadCaseBilling"("settlementStatus");

-- AddForeignKey
ALTER TABLE "LeadCaseBilling" ADD CONSTRAINT "LeadCaseBilling_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadCaseBilling" ADD CONSTRAINT "LeadCaseBilling_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
