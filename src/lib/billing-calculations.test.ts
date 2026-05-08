import { describe, expect, it } from "vitest";

import {
  computeBillingDerivedAmounts,
  computeCommissionableAmount,
  validateBillingAmountInput,
} from "@/lib/billing-calculations";
import { PaymentMethod } from "@/generated/prisma/enums";

const base = {
  totalCollected: 1000,
  medicineCost: 200,
  travelCost: 100,
  platformCommissionRatePercent: 10,
  paymentMethod: PaymentMethod.CASH,
};

describe("validateBillingAmountInput", () => {
  it("accepts valid simplified billing", () => {
    expect(validateBillingAmountInput(base)).toEqual({ ok: true });
  });

  it("rejects negative collected", () => {
    const r = validateBillingAmountInput({ ...base, totalCollected: -1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContain("TOTAL_COLLECTED_INVALID");
  });

  it("rejects non-integer collected", () => {
    const r = validateBillingAmountInput({ ...base, totalCollected: 10.5 });
    expect(r.ok).toBe(false);
  });

  it("rejects invalid medicine/travel", () => {
    let r = validateBillingAmountInput({ ...base, medicineCost: -3 });
    expect(r.ok).toBe(false);
    r = validateBillingAmountInput({ ...base, travelCost: -1 });
    expect(r.ok).toBe(false);
  });
});

describe("commission base", () => {
  it("uses totalCollected only (not expenses)", () => {
    expect(computeCommissionableAmount(base)).toBe(1000);
    expect(
      computeCommissionableAmount({
        ...base,
        medicineCost: 999,
        travelCost: 999,
      }),
    ).toBe(1000);
  });
});

describe("computeBillingDerivedAmounts", () => {
  it("computes commission on collected amount only", () => {
    const d = computeBillingDerivedAmounts(base);
    expect(d.commissionableAmount).toBe(1000);
    expect(d.platformCommissionAmount).toBe(100);
    expect(d.doctorEarningAmount).toBe(900);
    expect(d.grossAmount).toBe(1000);
    expect(d.dueAmount).toBe(0);
    expect(d.doctorPayableToPlatform).toBe(100);
  });

  it("uses zero commission when rate is zero", () => {
    const d = computeBillingDerivedAmounts({
      ...base,
      platformCommissionRatePercent: 0,
    });
    expect(d.platformCommissionAmount).toBe(0);
    expect(d.doctorEarningAmount).toBe(1000);
  });
});
