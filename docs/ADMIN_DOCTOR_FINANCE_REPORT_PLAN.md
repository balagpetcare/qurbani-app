# Admin doctor finance report — plan

**Project:** Quurbani 2026 Next.js (`qurbani-app`)  
**Date:** 2026-05-08  

## 1. Audit findings

### 1.1 Data

- **`LeadCaseBilling`** stores per-closure financials: `totalCollected`, `medicineCharge`, `transportCharge`, `commissionableAmount`, `platformCommissionAmount`, `doctorEarningAmount`, `completedAt`, `status` (`TreatmentCompletionStatus`), `doctorId`, `leadId`.
- **`Lead`**: `customerName`, `phone`, `areaId` / `area`, `preferredContact` (`VISIT` = home-visit preference for counting).
- Commission policy (already aligned with doctor portal): **percentage base = `totalCollected`** for new rows; **`platformCommissionAmount`** is snapshotted per invoice → **admin/company share** can be summed safely from stored `platformCommissionAmount`.

### 1.2 Admin shell

- Top nav: [`AdminNavBar.tsx`](src/components/admin/AdminNavBar.tsx) (`AdminTopNav` items).
- Bottom nav: [`admin-nav.ts`](src/lib/admin-nav.ts) — compact; heavy links also on [**`/admin/more`**](src/app/admin/(shell)/more/page.tsx).
- Reports hub: [**`/admin/reports`**](src/app/admin/(shell)/reports/page.tsx) — doctor performance counts only; **no finance**.

### 1.3 Auth

- [`requireAdminFromRequest`](src/lib/auth-guards.ts): **ADMIN + STAFF**, active user.
- Middleware already guards `/admin` and `/api/admin/*`.

### 1.4 Route decision

- Primary page: **`/admin/doctor-finance`** (dedicated finance report; avoids overloading `/admin/reports`).
- Cross-links: add card/link from **`/admin/reports`** labelled **ডাক্তার ফিন্যান্স রিপোর্ট**, and entry on **`/admin/more`**.
- Detail page: **`/admin/doctor-finance/[doctorId]`**.

## 2. “Completed cases only” default

- Default filter: **`LeadCaseBilling.status === COMPLETED`** (চিকিৎসা সমাপ্তি টাইপ **সম্পন্ন**).
- Query override: `closure=all` → include all billing closure statuses (`FOLLOW_UP_NEEDED`, `REFERRED`, `CANCELLED`).

## 3. Aggregation strategy

- **Where** builder from: optional `from`/`to` on `completedAt`, optional `doctorId`, optional `areaId` (on related `lead`), optional `search` (doctor `name` / `phone` contains), closure mode.
- **Per doctor**: `prisma.leadCaseBilling.groupBy` by `doctorId` with `_count`, `_sum` on numeric fields.
- **Home / visit count**: second `groupBy` with same filter plus `lead.preferredContact === VISIT`.
- **Grand totals**: `aggregate` on full `where` (no `groupBy`).
- **Pagination**: sort enriched rows by doctor name; **slice** after sort (`page`, `limit`, default limit 30).
- **Percentage base column**: display **`sum(totalCollected)`** (same as commission base rule).

## 4. API design

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/doctor-finance` | Query: `from`, `to`, `doctorId`, `areaId`, `search`, `closure`, `page`, `limit`. JSON: rows + grandTotals + meta. |
| GET | `/api/admin/doctor-finance/[doctorId]` | Same filter query params (except `doctorId`); returns doctor profile + case-wise billing rows. |

Both use **`requireAdminFromRequest`**.

## 5. UI

- **Summary page**: Bengali labels, `AdminNav`, summary cards (grand totals), GET filter form (dates, doctor select, area select, search, closure checkbox/select), responsive table, row action **বিস্তারিত** → detail route.
- **Detail page**: Doctor summary + case table (completion date, customer, phone, area, lead id, amounts, commission base, doctor earned, platform commission, link to admin lead).
- Empty state: **এই সময়ের মধ্যে কোনো কমপ্লিটেড কেস পাওয়া যায়নি।**

## 6. Files to add/change

| File | Action |
|------|--------|
| `docs/ADMIN_DOCTOR_FINANCE_REPORT_PLAN.md` | This plan |
| `src/lib/admin-doctor-finance-query.ts` | **New** — URL/query parsing + `LeadCaseBilling` where-clause (no `PrismaClient`; safe for unit tests without `DATABASE_URL`). |
| `src/lib/admin-doctor-finance.ts` | **New** — Aggregations + list/detail fetchers. |
| `src/lib/admin-doctor-finance.test.ts` | **New** — Tests for query/where helpers. |
| `src/app/api/admin/doctor-finance/route.ts` | GET list |
| `src/app/api/admin/doctor-finance/[doctorId]/route.ts` | GET detail |
| `src/app/admin/(shell)/doctor-finance/page.tsx` | Summary UI |
| `src/app/admin/(shell)/doctor-finance/[doctorId]/page.tsx` | Detail UI |
| `src/components/admin/AdminNavBar.tsx` | Nav item **ডাক্তার ফিন্যান্স** |
| `src/app/admin/(shell)/reports/page.tsx` | Link card **ডাক্তার ফিন্যান্স রিপোর্ট** |
| `src/app/admin/(shell)/more/page.tsx` | Link **ডাক্তার ফিন্যান্স** |
| `docs/ADMIN_DOCTOR_FINANCE_REPORT_IMPLEMENTATION_REPORT.md` | Post-implementation report |

## 7. Prisma

- **No schema changes** — reuse existing billing columns (`Int` BDT).

## 8. Post-implementation commands

- `npm run lint`, `npm run typecheck`, `npm test`
- `npx prisma validate`, `npx prisma generate`
