# Doctor finance system — implementation report

**Date:** 2026-05-08  
**Repository:** `qurbani-app` (Next.js only)

## Summary

Doctor treatment completion billing is reduced to **three financial inputs** (customer collected, medicine cost, travel cost). **Platform commission** is calculated only on **customer collected** (`totalCollected`), using the existing **admin site setting** `billing.platform_commission_rate_percent`. A new **ফিন্যান্স** area at **`/doctor/finance`**, **`GET /api/doctor/finance`**, and shared aggregation helper provide per-doctor summaries. **No Prisma migration** — existing `LeadCaseBilling` columns are reused (`totalCollected`, `medicineCharge`, `transportCharge`).

## Files changed / added

| Path | Notes |
|------|--------|
| `docs/DOCTOR_FINANCE_SYSTEM_PLAN.md` | Plan (audit, design, checklist). |
| `docs/DOCTOR_FINANCE_SYSTEM_IMPLEMENTATION_REPORT.md` | This report. |
| `src/lib/billing-calculations.ts` | Simplified `BillingAmountInput`; commission base = `totalCollected`; `computeDueAmount()` always 0. |
| `src/lib/billing-calculations.test.ts` | **New** — validation & commission tests. |
| `src/lib/doctor-finance-summary.ts` | **New** — Prisma aggregate + recent rows (strict `doctorId`). |
| `src/app/api/doctor/finance/route.ts` | **New** — authenticated doctor JSON summary. |
| `src/app/api/doctor/leads/[id]/complete/route.ts` | Parses `totalCollectedFromCustomer` / legacy `totalCollected`; `medicineCost`/`medicineCharge`; `travelCost`/`transportCharge`; expenses default empty→0; persists legacy fee columns from mobile when sent. |
| `src/components/doctor/DoctorTreatmentBillingForm.tsx` | Three Bengali-labelled amount fields + updated preview/read-only summary. |
| `src/components/doctor/DoctorPortalChrome.tsx` | Menu pills + desktop links: **ফিন্যান্স**. |
| `src/lib/doctor-nav.tsx` | Bottom nav: **ফিন্যান্স**. |
| `src/app/doctor/page.tsx` | Dashboard quick link **ফিন্যান্স সারাংশ**. |
| `src/app/doctor/finance/page.tsx` | **New** — summary cards + recent bill table. |

## Root cause / prior behaviour

- Billing UI and validation required many line items (service, emergency, discount, etc.).
- `commissionableAmount` was **`serviceFee + emergencyCharge`**, not aligned with “commission only on money collected from customer”.
- There was **no doctor-facing finance rollup** page.

## Behaviour after change

1. **Web completion form:** Doctor enters **কাস্টমার থেকে গৃহীত টাকা** (required), **মেডিসিন খরচ**, **যাতায়াত খরচ** (optional, default 0), plus payment method and existing clinical/showcase fields.
2. **Commission:** `commissionableAmount = totalCollected`; expenses do not affect commission.
3. **`POST /complete`:** Accepts **aliases** for mobile compatibility (`totalCollected`, `medicineCharge`, `transportCharge`) and new names (`totalCollectedFromCustomer`, `medicineCost`, `travelCost`).
4. **`/doctor/finance`:** Shows totals and **home visit preference count** (`Lead.preferredContact === VISIT` among billed leads), summed **doctor earning** from stored `doctorEarningAmount`, and up to **25** recent rows.
5. **Authorization:** Finance API and page use existing doctor session; data scoped by **`doctorId`**.

## Historical data note

Older billing rows may have **`commissionableAmount`** computed under the previous formula. The finance page labels the sum as ইতিহাসভিত্তিক where policies may differ.

## Commands run — results

| Command | Result |
|---------|--------|
| `npx prisma validate` | Schema valid |
| `npx prisma generate` | Client generated |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass (31 tests) |
| `npm run build` | Pass |

**Migration:** `npx prisma migrate dev` **not run** — no schema changes.

## Out of scope (per instructions)

- Flutter / mobile app repository unchanged.
- Admin reporting UI not expanded beyond existing patterns.
