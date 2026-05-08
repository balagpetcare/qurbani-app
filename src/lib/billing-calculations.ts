import type { TreatmentCompletionStatus } from "@/generated/prisma/enums";
import {
  LeadStatus,
  PaymentMethod,
  TreatmentCompletionStatus as TreatmentCompletionStatusEnum,
} from "@/generated/prisma/enums";

const PAYMENT_METHOD_VALUES = Object.values(PaymentMethod) as PaymentMethod[];

/**
 * Whole BDT amounts for closing a case. Commission base is **totalCollected only**
 * (গ্রাহক থেকে সংগৃহীত টাকা). Medicine and travel are expense-only for reporting.
 */
export type BillingAmountInput = {
  totalCollected: number;
  medicineCost: number;
  travelCost: number;
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

/** Stable codes for validation; map to Bengali in {@link billingValidationIssuesToBn}. */
export type BillingValidationIssue =
  | "TOTAL_COLLECTED_INVALID"
  | "MEDICINE_COST_INVALID"
  | "TRAVEL_COST_INVALID"
  | "COMMISSION_RATE_INVALID"
  | "PAYMENT_METHOD_INVALID";

const ISSUE_BN: Record<BillingValidationIssue, string> = {
  TOTAL_COLLECTED_INVALID:
    "কাস্টমার থেকে গৃহীত টাকা একটি সঠিক পূর্ণসংখ্যা দিন (০ বা তার বেশি)",
  MEDICINE_COST_INVALID: "মেডিসিন খরচ একটি সঠিক পূর্ণসংখ্যা দিন (০ বা তার বেশি)",
  TRAVEL_COST_INVALID: "যাতায়াত খরচ একটি সঠিক পূর্ণসংখ্যা দিন (০ বা তার বেশি)",
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

  if (!isNonNegativeInt(input.totalCollected)) issues.push("TOTAL_COLLECTED_INVALID");
  if (!isNonNegativeInt(input.medicineCost)) issues.push("MEDICINE_COST_INVALID");
  if (!isNonNegativeInt(input.travelCost)) issues.push("TRAVEL_COST_INVALID");

  const rate = input.platformCommissionRatePercent;
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    issues.push("COMMISSION_RATE_INVALID");
  }

  if (!PAYMENT_METHOD_VALUES.includes(input.paymentMethod)) {
    issues.push("PAYMENT_METHOD_INVALID");
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

/** Commission base = amount collected from customer only. */
export function computeCommissionableAmount(input: BillingAmountInput): number {
  return input.totalCollected;
}

/** Invoice total attributed to the customer payment (same as collected for this flow). */
export function computeGrossAmount(input: BillingAmountInput): number {
  return input.totalCollected;
}

export function computePlatformCommissionAmount(
  commissionableAmount: number,
  platformCommissionRatePercent: number,
): number {
  if (commissionableAmount <= 0 || platformCommissionRatePercent <= 0) return 0;
  return Math.floor((commissionableAmount * platformCommissionRatePercent) / 100);
}

/**
 * No separate “bill vs collected” line items — বাকি treated as ০ for this product flow.
 */
export function computeDueAmount(): number {
  return 0;
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
  const dueAmount = computeDueAmount();
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
