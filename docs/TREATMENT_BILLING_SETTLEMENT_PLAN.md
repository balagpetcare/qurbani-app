# Treatment completion, billing, commission, settlement, admin reports, and PDF invoices

**App:** Quarbani 2026 (`qurbani-app`)  
**Status:** Planning only — no implementation in the PR that added this document.  
**Date:** 2026-05-06  

This document records **current code findings** and a **concrete, modular plan** to add financial completion, platform commission, doctor settlement, admin reporting, and PDF invoices **without destabilising the existing lead/doctor workflow** unless a small, justified extension is required.

---

## 1. Current code findings

### 1.1 Stack and patterns

- **Next.js 16.2.4**, **React 19**, **Prisma 7** + **PostgreSQL** (`@prisma/adapter-pg`).
- **No React Server Actions** in the repo (`grep` shows no `"use server"` usage). Mutations are implemented as **Route Handlers** under `src/app/api/**/route.ts`.
- **Auth:** JWT in HTTP-only cookie (`AUTH_COOKIE_NAME`), verified in `src/lib/auth-token.ts`. **`src/middleware.ts`** protects:
  - `/admin/*` and `/api/admin/*` → roles **ADMIN** or **STAFF**
  - `/doctor/*` and `/api/doctor/*` → role **DOCTOR**
- **Guards:** `requireAdminFromRequest`, `requireDoctorFromRequest`, `requireMainAdminFromRequest` in `src/lib/auth-guards.ts` (API routes use cookie header).

### 1.2 Data model (relevant parts)

From `prisma/schema.prisma`:

- **`Lead`**: full intake + `status` (`LeadStatus` includes `COMPLETED`), `assignedDoctorId`, relations to `LeadCaseReport`, `LeadObservation`, `LeadAssignment`, etc.
- **`LeadCaseReport`** (1:1 with `Lead`, `leadId` unique): clinical closure fields — `doctorAdvice`, `diagnosis`, `treatmentGiven`, `medicineAdvice`, `followUpNeeded`, `nextFollowUpAt`, showcase fields, **`completedAt`**, **`completedByDoctorId`**.  
  **There are no monetary fields** today.
- **`SiteSetting`**: JSON key/value registry (`src/lib/site-setting-registry.ts`, loaders in `src/lib/site-settings.ts`). Used for toggles and public copy — **natural place for platform commission defaults** (admin-editable).
- **`User`** (doctors are `UserRole.DOCTOR`): profile and areas via **`DoctorArea`**; no billing/settlement fields.

### 1.3 Doctor treatment completion (today)

- **Draft report:** `PATCH /api/doctor/leads/[id]/case-report` — updates `LeadCaseReport` while lead is in editable statuses and report not completed (`src/app/api/doctor/leads/[id]/case-report/route.ts`).
- **Complete case:** `POST /api/doctor/leads/[id]/complete` (`src/app/api/doctor/leads/[id]/complete/route.ts`):
  - Allowed from **`IN_PROGRESS`** or **`OBSERVED`** only (`CAN_COMPLETE_FROM`).
  - Requires **diagnosis** and **treatmentGiven** (min length); optional doctor advice, medicine advice; follow-up rules; optional showcase fields.
  - In a transaction: **upsert `LeadCaseReport`** with `completedAt` / `completedByDoctorId`, set **`Lead.status = COMPLETED`**, append **`LeadStatusHistory`**, `LeadNote`, optional notifications.
- **UI:** `src/components/doctor/DoctorLeadWorkflowPanel.tsx` — steps 1–3 (accept/start, draft, complete). Client calls the APIs above via `fetch`.

### 1.4 Admin visibility

- **Lead detail:** `src/app/admin/(shell)/leads/[id]/page.tsx` loads `caseReport` and shows **সমাপনী রিপোর্ট (ডাক্তার)** (clinical + showcase + completion metadata). No billing block exists.
- **Reports:** `src/app/admin/(shell)/reports/page.tsx` — **doctor performance by counts** (leads, completed, pending, observations, etc.). **No financial metrics.**
- **API:** `GET /api/admin/doctors/performance` mirrors count-based stats (`src/app/api/admin/doctors/performance/route.ts`).

### 1.5 Attachments / media

- **`Lead.mediaUrls`**: stored as **JSON string** in DB (`String? @db.Text`); parsing helper `parseMediaUrlList` in `src/lib/lead-workflow.ts`. Comments in schema note file upload TBD.
- **Doctor applications** use optional `certificateUrl` — same **URL string** pattern.

**Implication:** Prescription/payment proof can **reuse URL-based fields** (single JSON array text or dedicated nullable string fields) until a dedicated upload pipeline exists.

### 1.6 Dependencies

- **`package.json`** has **no PDF library**. Adding one is a deliberate dependency decision (see §8).

---

## 2. Design principles (constraints)

1. **Preserve the existing lead state machine** unless product requires new terminal states. **`COMPLETED`** remains the terminal success state for “treatment finished.”
2. **Single authoritative completion transaction:** Clinical closure + billing snapshot + derived amounts should commit **together** (one DB transaction) when the doctor submits “complete,” so admin reports stay consistent.
3. **Server-side calculation:** Doctors submit **inputs** (line items, discount, collected, payment method); the API recomputes **gross, commission, settlement, due** using **settings + documented formulas** (never trust client totals alone).
4. **Immutability after completion:** After `completedAt` is set, **`LeadCaseReport` clinical + financial snapshot stays locked** (same rule as today for clinical edits); corrections via **admin-only adjustment** flow (future) or explicit “void/reopen” policy — **out of scope for v1** except documenting the rule.
5. **Modularity:** Prefer a dedicated **financial snapshot model** (or clearly separated columns) so reporting queries are simple and `LeadCaseReport` does not become an unbounded god-model unless the team prefers fewer tables.

---

## 3. Business → system mapping

| Business requirement | Current support | Planned mapping |
|---------------------|-----------------|-----------------|
| Treatment status | Implicit (`Lead.status == COMPLETED`) | Add explicit **`treatmentOutcome`** (enum) or short status on closure record |
| Observation / diagnosis | `diagnosis`, observations | Keep diagnosis; optional link text “observation summary” if distinct from `LeadObservation` |
| Treatment note | `treatmentGiven`, `doctorAdvice` | Keep |
| Medicines used | `medicineAdvice` (text) | Keep text; optional structured **`medicinesJson`** later |
| Fee line items + discount + totals | Missing | **Financial snapshot** (see §4) |
| Payment method | Missing | **`PaymentMethod` enum** on snapshot |
| Follow-up | `followUpNeeded`, `nextFollowUpAt` | Keep |
| Attachments | Pattern exists (`mediaUrls` JSON) | Optional URL fields or JSON array on snapshot |

---

## 4. Proposed Prisma schema changes

**Recommendation:** Add a **new 1:1 model** `LeadCaseFinancials` linked to **`leadId`** (and optionally `leadCaseReportId` if you want strict FK to report row). This keeps clinical (`LeadCaseReport`) and billing concerns separate and simplifies migrations.

### 4.1 New enums

```prisma
enum TreatmentOutcome {
  IMPROVED
  RECOVERED
  STABLE
  REFERRED_OUT
  DECEASED
  OTHER
}

enum PaymentMethod {
  CASH
  BKASH
  NAGAD
  ROCKET
  BANK
  CARD
  OTHER
}

enum DoctorSettlementStatus {
  NONE           // e.g. platform collected online; nothing owed by doctor
  OWES_PLATFORM  // doctor collected cash — commission owed per policy
  SETTLED        // marked reconciled by admin
}

enum CommissionBasis {
  GROSS_LESS_DISCOUNT
  SERVICE_FEE_ONLY
  // extend later if business rules split medicine vs visit
}
```

*Exact enum members should be confirmed with stakeholders; keep small for v1.*

### 4.2 New model: `LeadCaseFinancials` (draft shape)

**Purpose:** Store **doctor-entered inputs** at completion time and **server-computed outputs** (immutable snapshot).

Suggested fields (amounts in **whole BDT** as `Int`, consistent with existing `homeVisitFeeMin/Max` style on `User`):

**Inputs (doctor):**

- `serviceFee` — visit / service fee  
- `medicineCharge`  
- `transportCharge`  
- `emergencyCharge`  
- `otherCharge`  
- `discount` — non-negative; validation ensures `discount <= sum(charges before discount)`  
- `paymentMethod` — `PaymentMethod`  
- `amountCollected` — cash/digital actually collected from customer at scene (name aligns with “total collected”)  
- `dueAmountDoctorEntered` — optional cross-check; **server recomputes `dueComputed`** (see §6)  
- `prescriptionProofUrl`, `paymentProofUrl`, `extraAttachmentUrls` — optional strings or single `Json` for URL array (mirror `mediaUrls` pattern)

**Outputs (server, stored for audit):**

- `grossBeforeDiscount` — sum of charge lines  
- `netBill` — `grossBeforeDiscount - discount` (define naming in UI as “gross bill” vs “net after discount” — see §6)  
- `commissionRateBps` — basis points snapshot (e.g. 1500 = 15.00%) **or** `commissionRatePercent` as fixed decimal in settings  
- `commissionableAmount` — base used for %  
- `platformCommissionAmount`  
- `doctorEarningAmount` — net to doctor after platform cut (definition in §6)  
- `doctorOwesPlatformAmount` — **0** if payment not cash or policy says otherwise; else **platform commission or full fee per policy**  
- `dueComputed` — outstanding customer balance after collection  
- `settlementStatus` — `DoctorSettlementStatus`  
- `computedAt` — redundant with `completedAt` but useful if recomputation ever happens in admin tools  

**Relations:**

- `leadId Int @unique` → `Lead`  
- Optional `completedByDoctorId Int` denormalized copy for reporting (or rely on `LeadCaseReport.completedByDoctorId`)

**Indexes:**

- `[completedByDoctorId]` or via join through lead — for doctor settlement dashboards  
- `[settlementStatus]` partial/index for admin queues  

### 4.3 Optional extensions to `LeadCaseReport`

- `treatmentOutcome TreatmentOutcome?` — if you want clinical enum next to narrative fields.  
- Alternatively store outcome only on `LeadCaseFinancials` — **not recommended** (clinical vs money separation).

### 4.4 Site settings keys (registry)

Add to `SITE_SETTING_KEYS` / `SITE_SETTING_SEED_ROWS`:

- `billing.platform_commission_rate_bps` (number, default e.g. `1000` = 10%)  
- `billing.commission_basis` (string enum stored as Json string: `SERVICE_FEE_ONLY` vs `GROSS_LESS_DISCOUNT`)  
- `billing.cash_collection_doctor_pays_full_commission` (boolean — policy toggle)  
- Optional: `billing.invoice_legal_name`, `billing.invoice_address`, `billing.invoice_bin` for PDF header  

Wire helpers in `site-settings.ts` similar to `getDoctorInAppNotificationsEnabled`.

---

## 5. Calculation formulas (authoritative spec)

**Notation:** All amounts integers (BDT). Define:

- \(L_{\text{visit}}\) = service fee  
- \(L_{\text{med}}\) = medicine charge  
- \(L_{\text{trans}}\) = transport  
- \(L_{\text{em}}\) = emergency  
- \(L_{\text{oth}}\) = other  
- \(D\) = discount  

### 5.1 Gross and net bill

\[
\text{grossBeforeDiscount} = L_{\text{visit}} + L_{\text{med}} + L_{\text{trans}} + L_{\text{em}} + L_{\text{oth}}
\]

\[
\text{netBill} = \max(0, \text{grossBeforeDiscount} - D)
\]

**UI labels:** Map “gross bill” to **`grossBeforeDiscount`** or **`netBill`** consistently in BN/EN helper copy — pick one term for staff training.

### 5.2 Commissionable amount

Configurable **`commission_basis`**:

- **`SERVICE_FEE_ONLY`:** \(C_{\text{base}} = L_{\text{visit}}\)  
- **`GROSS_LESS_DISCOUNT`:** \(C_{\text{base}} = \text{netBill}\) (or exclude transport if policy demands — document any exclusion explicitly in settings comment)

v1 default recommendation: **`SERVICE_FEE_ONLY`** to avoid arguing over medicine pass-through.

### 5.3 Platform commission

With rate \(r\) from settings (e.g. \(r = 0.10\) for 10%):

\[
\text{platformCommissionAmount} = \left\lfloor C_{\text{base}} \times r \right\rfloor
\]

Use **floor** to avoid overstating commission in favour of the platform (tune if accountants prefer round-half-up).

### 5.4 Doctor earning (interpretation)

Two common models — **pick one in product sign-off**:

**Model A — commission subtracted from collected:**

\[
\text{doctorEarningAmount} = \text{amountCollected} - \text{platformCommissionAmount}
\]

(Only meaningful if doctor retains collection.)

**Model B — split of netBill:**

\[
\text{doctorEarningAmount} = \text{netBill} - \text{platformCommissionAmount}
\]

**Recommendation for field service:** Use **Model A** when `amountCollected` is the primary truth; cap doctor earning at `max(0, …)`. Display **Model B** as “theoretical” if collection < net bill.

Document chosen model in admin settings tooltip.

### 5.5 Due amount (customer owes)

Doctor may enter “due” for reconciliation; server validates:

\[
\text{dueComputed} = \max(0, \text{netBill} - \text{amountCollected})
\]

If doctor enters `dueAmountDoctorEntered`, allow **small tolerance** (e.g. ±1 BDT) or require **exact match** with `dueComputed`.

### 5.6 Settlement status and “doctor pays platform”

Policy table (example — **must be confirmed**):

| Payment method | Platform commission collected how? | `doctorOwesPlatformAmount` |
|----------------|-----------------------------------|----------------------------|
| CASH | Doctor holds cash until remittance | `= platformCommissionAmount` (or full fee if policy) |
| BKASH/NAGAD to **company** | Already with platform | `0`, `settlementStatus = NONE` |
| BKASH to **doctor** | Same as cash | `= platformCommissionAmount` |

v1 simplification: **`doctorOwesPlatformAmount = platformCommissionAmount`** iff `paymentMethod == CASH` else `0`; **`settlementStatus`** defaults to `OWES_PLATFORM` or `NONE` accordingly. Admin can later mark `SETTLED` when bank confirms.

---

## 6. Route / page / component changes

### 6.1 Doctor UI

**File:** `src/components/doctor/DoctorLeadWorkflowPanel.tsx`

- **Step 2 (draft):** Optionally allow entering **fee fields** early (local state only) — **or** defer all fee fields to step 3 to match “submit once” semantics.  
- **Step 3 (complete):** Add form sections:
  - Treatment outcome (select)  
  - Money section: line items, discount, collected, payment method, computed preview (read-only) if feasible client-side **for UX only** — server remains source of truth  
  - Follow-up (existing)  
  - Optional proof URLs (text inputs until upload exists)

**File:** `src/app/doctor/leads/[id]/page.tsx`

- Pass initial financial snapshot from DB if ever allowing edit before complete (unlikely). For completed leads, show **read-only invoice summary** card.

### 6.2 Admin UI

**Lead detail** — `src/app/admin/(shell)/leads/[id]/page.tsx`

- New **“বিলিং ও নিষ্পত্তি”** section: line items, computed totals, commission, settlement badge, link **“ইনভয়েস দেখুন / PDF”**.

**Dashboard** — `src/app/admin/(shell)/page.tsx`

- Add aggregate cards: completed count (existing), **total bill, collected, due, platform commission** (global filters optional later).

**Reports** — `src/app/admin/(shell)/reports/page.tsx`

- Extend table (or add sub-tab) with **financial columns**: completed cases, sum collected, sum platform commission, sum doctor owes platform, settlement breakdown.

**New page (recommended):** `src/app/admin/(shell)/doctors/[id]/billing/page.tsx` (or `/settlements`)

- Doctor header (name, areas)  
- KPI row: cases, total bill, collected, medicine/transport totals, commission, owes platform  
- **Per-case table** with links to lead detail + PDF  

**Navigation:** Add link from `src/app/admin/(shell)/doctors/[id]/edit/page.tsx` or doctor list to this report.

### 6.3 API routes

| Endpoint | Purpose |
|----------|---------|
| `POST /api/doctor/leads/[id]/complete` | **Extend body** with financial + outcome fields; in transaction create/update **`LeadCaseFinancials`**, compute amounts, keep existing case report + status behaviour. |
| `PATCH /api/doctor/leads/[id]/case-report` | Optionally allow drafting fee fields into **`LeadCaseFinancials`** with `completedAt == null` **or** keep financials only on complete — simpler v1: **financials only written at complete**. |
| `GET /api/admin/leads/[id]/invoice.pdf` or `GET /api/admin/leads/[id]/invoice` | Returns PDF bytes (`Content-Type: application/pdf`) or redirects — **admin-only**. |
| `GET /api/admin/reports/billing-summary` (optional) | JSON aggregates for dashboard widgets to avoid duplicating heavy Prisma in RSC. |

**Doctor read-only:** `GET /api/doctor/leads/[id]` could include financial summary for completed cases — verify shape in `src/app/api/doctor/leads/[id]/route.ts`.

---

## 7. Admin report design

### 7.1 Global summary (dashboard / top of reports page)

- Total **completed leads** (status `COMPLETED`) — optionally scoped to date range (phase 2).  
- **Sum `netBill`** (or `grossBeforeDiscount` — pick one label).  
- **Sum `amountCollected`**.  
- **Sum `dueComputed`**.  
- **Sum `platformCommissionAmount`**.  
- **Sum `doctorOwesPlatformAmount` where settlementStatus != SETTLED** — “outstanding settlement.”

### 7.2 Doctor-wise table

Columns: Doctor name, **completed cases**, **total net bill**, **total collected**, **total commission**, **total owes platform**, **unsettled count**.

Filters (phase 2): date range, area, settlement status.

### 7.3 Doctor profile drill-down

- Same KPIs plus **breakdown by lead**: ID, date completed, net bill, collected, payment method, commission, owes platform, settlement status, actions (lead, PDF).

---

## 8. PDF invoice design and library choice

### 8.1 Requirements

- Generated **on the server** inside Route Handlers or server components calling a **pure PDF builder** (no client-side generation required for admin).  
- Content: organisation header (from `SiteSetting`), invoice number (`leadId` or sequential invoice id), dates, customer anonymisation choice (**recommended:** mask phone except last 4 digits), doctor name, itemised lines, totals, commission section (optional visibility for internal invoice vs customer-facing — **decide**: separate **customer receipt** vs **internal settlement sheet**).

### 8.2 Package options (avoid heavy native deps)

| Package | Pros | Cons |
|---------|------|------|
| **`pdf-lib`** | Small, pure JS, no headless browser, **low supply-chain surprise** | Manual layout; Bengali needs **font embedding** (extra work) |
| **`@react-pdf/renderer`** | Familiar React layout | Larger dependency; font embedding still needed for BN glyphs |
| **Puppeteer / Playwright** | Perfect CSS rendering | **Heavy**, ops risk — **avoid** unless necessary |

**Recommendation:** Use **`pdf-lib`** for v1 **numeric + ASCII/Basic Latin** invoice body, with **Bengali labels** deferred or rendered as **embedded subset font** once a verified `.ttf` is legally bundled. This matches **“safest / lightest”** preference.

**Why not Puppeteer:** Downloads Chromium-sized artifacts in many deployments; harder on constrained hosts.

---

## 9. Migration and seed impact

- **New Prisma migration:** creates enums + `LeadCaseFinancials` + indexes.  
- **Backfill:** Existing `COMPLETED` leads without financial rows: **`LeadCaseFinancials` absent** — reports must **`LEFT JOIN`** and treat missing as “pre-billing era.” Optional one-off admin script to mark old rows as `NONE` with zeros **only if** business accepts default zeros.  
- **Seed (`prisma/seed.ts`):** append new `SiteSetting` keys via `SITE_SETTING_SEED_ROWS` upserts (same pattern as existing settings). No sample financial rows required.  
- **`.env`:** No new secrets for PDF v1; future S3 uploads would add keys.

---

## 10. Validation rules (API-level)

1. **Completion still requires** existing clinical rules (diagnosis, treatment, etc.).  
2. **All monetary inputs** integers ≥ 0 (discount ≥ 0 and ≤ `grossBeforeDiscount`).  
3. **`paymentMethod`** required at completion.  
4. **`treatmentOutcome`** required if product mandates (optional v1).  
5. **Follow-up:** unchanged — if `followUpNeeded`, `nextFollowUpAt` required.  
6. **`amountCollected`** ≤ `netBill + doctorEnteredTolerance` (warn vs error — **recommend error** if collected > netBill + small epsilon unless “advance payment” is real).  
7. **Recompute** all derived fields server-side; reject if client “total” mismatches recomputation beyond epsilon.  
8. **Idempotency:** second POST complete should return **400** as today when already completed.

---

## 11. Testing checklist

### 11.1 Doctor flow

- [ ] Complete from `IN_PROGRESS` / `OBSERVED` with full billing payload → lead `COMPLETED`, single financial row, history row.  
- [ ] Validation errors for bad discount, negative numbers, missing payment method.  
- [ ] Follow-up required path unchanged.  
- [ ] Non-assigned doctor cannot complete.  
- [ ] Completed case report + financials read-only on doctor detail.

### 11.2 Admin flow

- [ ] Dashboard/report aggregates match sum of per-lead rows for a test dataset.  
- [ ] Doctor-wise report matches filter by `completedByDoctorId` / assignment rules (align with **who completed** vs **assigned** — document if edge case for reassignment).  
- [ ] PDF downloads only for **ADMIN/STAFF**; returns **404** for missing financial row.  
- [ ] Lead detail shows billing section.

### 11.3 Settlement

- [ ] CASH sets `OWES_PLATFORM` and correct owes amount; non-cash clears owes.  
- [ ] Admin marking **SETTLED** (when implemented) updates list filters.

### 11.4 Regression

- [ ] Existing doctor workflow without billing fields **rejected** after rollout — **breaking change** unless migration provides defaults; for launch, **deploy UI + API together** and communicate downtime.

---

## 12. Compatibility note (existing completed leads)

Rolling out required billing fields will **break** `POST .../complete` if doctors retry completion on old flows — mitigated because **`completedAt`** already blocks. **New completions** must send billing data. No change to **`Lead` intake** form.

---

## 13. Exact next implementation steps (ordered)

1. **Product sign-off** on formulas (§5), settlement rules (§5.6), and commission basis default.  
2. **Prisma:** Add enums + `LeadCaseFinancials` + migration; regenerate client.  
3. **Site settings:** Add billing keys + admin settings UI group on `/admin/settings` (reuse patterns from existing settings page).  
4. **Pure TS module:** `src/lib/billing/compute-case-financials.ts` — unit-testable functions from inputs + settings.  
5. **API:** Extend `POST .../complete` with validation + transaction inserting financial snapshot.  
6. **Doctor UI:** Extend `DoctorLeadWorkflowPanel` step 3 with new fields and client-side preview (optional).  
7. **Admin lead detail:** Show financial block + PDF button.  
8. **PDF:** Implement `GET .../invoice.pdf` with `pdf-lib` + minimal layout.  
9. **Admin reports:** Extend `/admin/reports` and/or dashboard Prisma aggregations; optional JSON API route.  
10. **Doctor billing page:** New admin doctor billing drill-down page.  
11. **QA:** Run checklist §11; fix edge cases; document operator training in existing admin guide if needed.

---

## 14. Out of scope / later phases

- Payment gateway integration and automatic commission collection.  
- Multi-currency.  
- Doctor-initiated disputes or invoice edits after completion.  
- Full structured medicine catalog.  
- File upload for proofs (URLs only until storage exists).

---

*End of plan.*
