# Admin doctor finance report — implementation report

**Date:** 2026-05-08  
**Scope:** Next.js `qurbani-app` only  

## Summary

Admin users (**ADMIN** / **STAFF**) can open **`/admin/doctor-finance`** to view **doctor-wise** aggregates from **`LeadCaseBilling`**, with filters (date range, doctor, lead area, search, closure type), summary cards, paginated table, and **`/admin/doctor-finance/[doctorId]`** for **case-level** rows plus links to **`/admin/leads/[id]`**.  

**Commission / percentage base in reporting:** **`percentageBaseAmount` per row = sum of `totalCollected`** (গ্রাহক থেকে গৃহীত); **`platformCommissionAmount`** summed as **কোম্পানি কমিশন** (snapshotted per invoice). Medicine/travel remain expense-only and are **not** subtracted from the base.

## Routes chosen

- **List:** `/admin/doctor-finance` (dedicated page; **`রিপোর্ট`** hub links here as **ডাক্তার ফিন্যান্স রিপোর্ট**).
- **Detail:** `/admin/doctor-finance/[doctorId]`.

## Files added

| File | Role |
|------|------|
| `docs/ADMIN_DOCTOR_FINANCE_REPORT_PLAN.md` | Plan |
| `docs/ADMIN_DOCTOR_FINANCE_REPORT_IMPLEMENTATION_REPORT.md` | This report |
| `src/lib/admin-doctor-finance-query.ts` | Parse/serialize query params + Prisma `where` builder (**no DB client** — unit-test friendly). |
| `src/lib/admin-doctor-finance.ts` | Aggregations (`fetchAdminDoctorFinanceList`, `fetchAdminDoctorFinanceDetail`). |
| `src/lib/admin-doctor-finance.test.ts` | Tests for query helpers. |
| `src/app/api/admin/doctor-finance/route.ts` | `GET` JSON list |
| `src/app/api/admin/doctor-finance/[doctorId]/route.ts` | `GET` JSON detail |
| `src/app/admin/(shell)/doctor-finance/page.tsx` | Admin UI list |
| `src/app/admin/(shell)/doctor-finance/[doctorId]/page.tsx` | Admin UI detail |

## Files updated

| File | Change |
|------|--------|
| `src/lib/admin-routes.ts` | `ADMIN_DOCTOR_FINANCE_PATH`, `adminDoctorFinanceDetailPath()` |
| `src/components/admin/AdminNavBar.tsx` | Top nav: **ডাক্তার ফিন্যান্স** |
| `src/app/admin/(shell)/reports/page.tsx` | Card link **ডাক্তার ফিন্যান্স রিপোর্ট** |
| `src/app/admin/(shell)/more/page.tsx` | Extra quick link |

## Security

- Pages live under **`admin/(shell)`** (middleware-enforced).
- APIs use **`requireAdminFromRequest`** (ADMIN/STAFF, active).

## Default “completed only”

- **`LeadCaseBilling.status === COMPLETED`** unless `closure=all`.

## Prisma

- **No migration.** Schema unchanged.

## Commands run

| Command | Result |
|---------|--------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass (39 tests) |
| `npm run build` | Pass |
| `npx prisma validate` | Valid |
| `npx prisma generate` | Success |

## Limits / notes

- Doctor list shows only doctors with **≥1** billing row matching filters (natural `groupBy` result).
- Historical **`commissionableAmount`** may differ from **`totalCollected`** on old rows; UI **ভিত্তি** column uses **`totalCollected`** sum per business rule.
