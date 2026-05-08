# Doctor finance system — implementation plan

**Project:** Quarbani 2026 Next.js (`qurbani-app`)  
**Date:** 2026-05-08  

## 1. Audit findings

### 1.1 Data model (`prisma/schema.prisma`)

- **`LeadCaseBilling`** already holds financial snapshots per closed lead:
  - `totalCollected` — maps to **গ্রাহক থেকে গৃহীত মোট**
  - `medicineCharge`, `transportCharge` — map to **medicine cost** and **travel/home-call cost** (reuse; no new Decimal columns — schema uses whole BDT `Int`, consistent with existing rows).
  - `serviceFee`, `emergencyCharge`, `otherCharge`, `discountAmount` — legacy breakdown; web UI will stop collecting these (send `0`). Mobile app may still send legacy fields; server persists them but **commission base ignores them**.
  - `commissionableAmount`, `platformCommissionRate`, `platformCommissionAmount`, `doctorEarningAmount` — already computed at billing time.
- **`Lead.preferredContact`** (`LeadContactPreference`: CALL / WHATSAPP / VISIT) — use **`VISIT`** as proxy for “হোম ভিজিট / ভিজিট প্রাধান্য” for **homeCallCount**.

### 1.2 Commission policy (change)

- **Current code** (`src/lib/billing-calculations.ts`): `commissionableAmount = serviceFee + emergencyCharge`.
- **New rule:** `commissionableAmount = totalCollected` only (গ্রাহক থেকে সংগৃহীত টাকা). Medicine and transport remain **expense-only** fields for reporting; they do **not** affect commission.
- **Existing admin setting:** `SiteSetting` key `billing.platform_commission_rate_percent` via `getBillingPlatformCommissionRatePercent()` — **reuse**.

### 1.3 Treatment completion API

- **`POST /api/doctor/leads/[id]/complete`** (`src/app/api/doctor/leads/[id]/complete/route.ts`) validates billing, derives amounts, creates `LeadCaseBilling`.

### 1.4 Web UI

- **`DoctorTreatmentBillingForm`** (`src/components/doctor/DoctorTreatmentBillingForm.tsx`) — multi-field billing; will be reduced to three amount fields + payment + preview.
- **Doctor shell:** `DoctorPortalChrome`, `src/lib/doctor-nav.tsx` — add **ফিন্যান্স** → `/doctor/finance`.
- **Dashboard:** `src/app/doctor/page.tsx` — add quick link card.

### 1.5 Flutter / mobile

- **Out of scope for this repo:** no Flutter changes. API remains backward compatible:
  - Accept legacy JSON keys (`totalCollected`, `medicineCharge`, `transportCharge`, …).
  - Accept optional aliases: `totalCollectedFromCustomer`, `medicineCost`, `travelCost`.
  - Commission **always** computed from resolved `totalCollected` after this change.

## 2. Database / Prisma

- **No migration:** reuse `LeadCaseBilling` integer columns and enums.

## 3. Shared logic

### 3.1 `src/lib/billing-calculations.ts`

- Replace `BillingAmountInput` with simplified shape:
  - `totalCollected`, `medicineCost`, `travelCost`, `platformCommissionRatePercent`, `paymentMethod`.
- Validation:
  - Non-negative integers; `totalCollected` required (reject unparsable / negative).
  - `medicineCost` / `travelCost` default `0`.
  - Remove discount vs line-sum checks (no longer collecting discount).
- `computeCommissionableAmount` → returns `input.totalCollected`.
- `computeGrossAmount` → `input.totalCollected` (invoice total from customer perspective; aligns summary).
- `computeDueAmount` → `0` (optional: `grossAmount - totalCollected` is always 0).

### 3.2 `src/lib/doctor-finance-summary.ts` (new)

- `buildDoctorFinanceSummary(doctorUserId: number)` — Prisma aggregates + recent rows for UI/API.
- Strict `doctorId` filter.

## 4. API

- **`GET /api/doctor/finance`** — `requireDoctorFromRequest`; returns JSON summary + recent billings. Uses shared builder.

## 5. UI

| Item | Action |
|------|--------|
| `/doctor/finance` | New server page: summary cards + table of recent completed billings (Bengali labels). |
| `DoctorPortalChrome` | Add desktop + mobile pill + drawer link **ফিন্যান্স** (`Banknote` icon). |
| `doctor-nav.tsx` | Add bottom nav entry (between লিড and সেটিংস). |
| `doctor/page.tsx` | Link/card to ফিন্যান্স. |
| `DoctorTreatmentBillingForm` | Three inputs + Bengali copy + updated commission preview (base = গৃহীত টাকা). Read-only billing summary after completion shows simplified labels. |

## 6. Validation / Bengali messages

- Centralized in `billing-calculations.ts` issue map:
  - Invalid numbers, negative values, invalid commission rate, invalid payment method.
  - **কাস্টমার থেকে গৃহীত টাকা** required / invalid messages.

## 7. Tests

- Add `src/lib/billing-calculations.test.ts` — commission base from `totalCollected`, validation, derived amounts.

## 8. Files to touch (checklist)

- `docs/DOCTOR_FINANCE_SYSTEM_PLAN.md` (this file)
- `src/lib/billing-calculations.ts`
- `src/lib/billing-calculations.test.ts` (new)
- `src/lib/doctor-finance-summary.ts` (new)
- `src/app/api/doctor/leads/[id]/complete/route.ts`
- `src/app/api/doctor/finance/route.ts` (new)
- `src/components/doctor/DoctorTreatmentBillingForm.tsx`
- `src/components/doctor/DoctorPortalChrome.tsx`
- `src/lib/doctor-nav.tsx`
- `src/app/doctor/page.tsx`
- `src/app/doctor/finance/page.tsx` (new)
- `docs/DOCTOR_FINANCE_SYSTEM_IMPLEMENTATION_REPORT.md` (after implementation)

## 9. Commands (post-implementation)

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npx prisma validate`
- `npx prisma generate`

(No `migrate dev` unless schema changes — none planned.)
