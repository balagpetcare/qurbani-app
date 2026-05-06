import type { TreatmentCompletionStatus } from "@/generated/prisma/enums";
import {
  LeadStatus,
  PaymentMethod,
  TreatmentCompletionStatus as TreatmentCompletionStatusEnum,
} from "@/generated/prisma/enums";

const PAYMENT_METHOD_VALUES = Object.values(PaymentMethod) as PaymentMethod[];

/** Whole BDT amounts and policy inputs used when closing a case with billing. */
export type BillingAmountInput = {
  serviceFee: number;
  medicineCharge: number;
  transportCharge: number;
  emergencyCharge: number;
  otherCharge: number;
  discountAmount: number;
  totalCollected: number;
  /** Platform commission rate as percent, e.g. `10` means 10%. */
  platformCommissionRatePercent: number;
  paymentMethod: PaymentMethod;
};

export type BillingDerivedAmounts = {
  grossAmount: number;
  commissionableAmount: number;
  platformCommissionAmount: number;
  dueAmount: number;
  doctorEarningAmount: number;
  doctorPayableToPlatform: number;
};

function isNonNegativeInt(n: number): boolean {
  return Number.isInteger(n) && n >= 0;
}

function sumChargesBeforeDiscount(input: BillingAmountInput): number {
  return (
    input.serviceFee +
    input.medicineCharge +
    input.transportCharge +
    input.emergencyCharge +
    input.otherCharge
  );
}

/** Stable codes for validation; map to Bengali in {@link billingValidationIssuesToBn}. */
export type BillingValidationIssue =
  | "SERVICE_FEE_INVALID"
  | "MEDICINE_CHARGE_INVALID"
  | "TRANSPORT_CHARGE_INVALID"
  | "EMERGENCY_CHARGE_INVALID"
  | "OTHER_CHARGE_INVALID"
  | "DISCOUNT_INVALID"
  | "TOTAL_COLLECTED_INVALID"
  | "DISCOUNT_EXCEEDS_CHARGES"
  | "COMMISSION_RATE_INVALID"
  | "PAYMENT_METHOD_INVALID";

const ISSUE_BN: Record<BillingValidationIssue, string> = {
  SERVICE_FEE_INVALID: "সার্ভিস ফি সঠিক পূর্ণসংখ্যা নয়",
  MEDICINE_CHARGE_INVALID: "ঔষধ চার্জ সঠিক পূর্ণসংখ্যা নয়",
  TRANSPORT_CHARGE_INVALID: "পরিবহন চার্জ সঠিক পূর্ণসংখ্যা নয়",
  EMERGENCY_CHARGE_INVALID: "জরুরি চার্জ সঠিক পূর্ণসংখ্যা নয়",
  OTHER_CHARGE_INVALID: "অন্যান্য চার্জ সঠিক পূর্ণসংখ্যা নয়",
  DISCOUNT_INVALID: "ছাড়ের পরিমাণ সঠিক পূর্ণসংখ্যা নয়",
  TOTAL_COLLECTED_INVALID: "মোট গৃহীত টাকা সঠিক পূর্ণসংখ্যা নয়",
  DISCOUNT_EXCEEDS_CHARGES:
    "ছাড় মোট চার্জের চেয়ে বেশি হতে পারবে না (সার্ভিস+ঔষধ+পরিবহন+জরুরি+অন্যান্য)",
  COMMISSION_RATE_INVALID: "প্ল্যাটফর্ম কমিশন হার ০–১০০ এর মধ্যে হতে হবে",
  PAYMENT_METHOD_INVALID: "পেমেন্ট পদ্ধতি সঠিক নয়",
};

export function billingValidationIssuesToBn(issues: BillingValidationIssue[]): string[] {
  return issues.map((k) => ISSUE_BN[k] ?? k);
}

/**
 * Validates doctor/API inputs before persistence.
 * Keeps project convention (no Zod in direct deps); callers may wrap this.
 */
export function validateBillingAmountInput(input: BillingAmountInput): {
  ok: true;
} | {
  ok: false;
  issues: BillingValidationIssue[];
} {
  const issues: BillingValidationIssue[] = [];

  if (!isNonNegativeInt(input.serviceFee)) issues.push("SERVICE_FEE_INVALID");
  if (!isNonNegativeInt(input.medicineCharge)) issues.push("MEDICINE_CHARGE_INVALID");
  if (!isNonNegativeInt(input.transportCharge)) issues.push("TRANSPORT_CHARGE_INVALID");
  if (!isNonNegativeInt(input.emergencyCharge)) issues.push("EMERGENCY_CHARGE_INVALID");
  if (!isNonNegativeInt(input.otherCharge)) issues.push("OTHER_CHARGE_INVALID");
  if (!isNonNegativeInt(input.discountAmount)) issues.push("DISCOUNT_INVALID");
  if (!isNonNegativeInt(input.totalCollected)) issues.push("TOTAL_COLLECTED_INVALID");

  const beforeDiscount = sumChargesBeforeDiscount(input);
  if (input.discountAmount > beforeDiscount) {
    issues.push("DISCOUNT_EXCEEDS_CHARGES");
  }

  const rate = input.platformCommissionRatePercent;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    issues.push("COMMISSION_RATE_INVALID");
  }

  if (!PAYMENT_METHOD_VALUES.includes(input.paymentMethod)) {
    issues.push("PAYMENT_METHOD_INVALID");
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

/**
 * Commission base: service fee + emergency charge (initial policy per product spec).
 */
export function computeCommissionableAmount(input: BillingAmountInput): number {
  return input.serviceFee + input.emergencyCharge;
}

/**
 * grossAmount = sum(line charges) - discount
 */
export function computeGrossAmount(input: BillingAmountInput): number {
  const sum =
    input.serviceFee +
    input.medicineCharge +
    input.transportCharge +
    input.emergencyCharge +
    input.otherCharge;
  return Math.max(0, sum - input.discountAmount);
}

export function computePlatformCommissionAmount(
  commissionableAmount: number,
  platformCommissionRatePercent: number,
): number {
  if (commissionableAmount <= 0 || platformCommissionRatePercent <= 0) return 0;
  return Math.floor((commissionableAmount * platformCommissionRatePercent) / 100);
}

/**
 * dueAmount = grossAmount - totalCollected (may be negative if over-collected; callers may clamp for UI).
 */
export function computeDueAmount(grossAmount: number, totalCollected: number): number {
  return grossAmount - totalCollected;
}

/**
 * When the doctor collected cash on-site, they remit the platform commission amount.
 * Other channels default to 0 for v1 (reconcile via admin if policy changes).
 */
export function computeDoctorPayableToPlatform(
  platformCommissionAmount: number,
  paymentMethod: PaymentMethod,
): number {
  if (paymentMethod === "CASH") return platformCommissionAmount;
  return 0;
}

/**
 * Net to doctor after platform commission on collected funds.
 */
export function computeDoctorEarningAmount(
  totalCollected: number,
  platformCommissionAmount: number,
): number {
  return totalCollected - platformCommissionAmount;
}

/** Single entry point: derive all stored totals from validated inputs. */
export function computeBillingDerivedAmounts(
  input: BillingAmountInput,
): BillingDerivedAmounts {
  const grossAmount = computeGrossAmount(input);
  const commissionableAmount = computeCommissionableAmount(input);
  const platformCommissionAmount = computePlatformCommissionAmount(
    commissionableAmount,
    input.platformCommissionRatePercent,
  );
  const dueAmount = computeDueAmount(grossAmount, input.totalCollected);
  const doctorEarningAmount = computeDoctorEarningAmount(
    input.totalCollected,
    platformCommissionAmount,
  );
  const doctorPayableToPlatform = computeDoctorPayableToPlatform(
    platformCommissionAmount,
    input.paymentMethod,
  );

  return {
    grossAmount,
    commissionableAmount,
    platformCommissionAmount,
    dueAmount,
    doctorEarningAmount,
    doctorPayableToPlatform,
  };
}

/**
 * Deterministic invoice reference: one billing row per lead — includes year for readability.
 * Uniqueness is enforced with DB `invoiceNo` @unique; avoid reuse across environments by prefix if needed.
 */
export function buildInvoiceNo(leadId: number, completedAt: Date): string {
  const y = completedAt.getFullYear();
  const shortYear = String(y).slice(2);
  const paddedLead = String(leadId).padStart(6, "0");
  return `Q${shortYear}-${paddedLead}`;
}

/** Explains default settlement row shown after save (admin may change later). */
export function settlementPreviewLabelBn(params: {
  doctorPayableToPlatform: number;
  paymentMethod: PaymentMethod;
}): string {
  if (params.paymentMethod === "CASH" && params.doctorPayableToPlatform > 0) {
    return "অনিষ্পত্ত — নগদে গ্রহণ; প্ল্যাটফর্মে কমিশন পরিশোধ বাকি";
  }
  return "অনিষ্পত্ত — পর্যালোচনা/সেটেলমেন্ট অপেক্ষমান";
}

export function treatmentCompletionStatusToLeadStatus(
  t: TreatmentCompletionStatus,
): LeadStatus {
  switch (t) {
    case TreatmentCompletionStatusEnum.COMPLETED:
      return LeadStatus.COMPLETED;
    case TreatmentCompletionStatusEnum.FOLLOW_UP_NEEDED:
      return LeadStatus.FOLLOW_UP_NEEDED;
    case TreatmentCompletionStatusEnum.REFERRED:
      return LeadStatus.REFERRED;
    case TreatmentCompletionStatusEnum.CANCELLED:
      return LeadStatus.CANCELLED;
    default:
      return LeadStatus.COMPLETED;
  }
}
