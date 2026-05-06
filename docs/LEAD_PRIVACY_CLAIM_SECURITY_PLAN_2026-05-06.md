# Lead privacy, doctor contact hiding, and claim-lock security — implementation plan

**Date:** 2026-05-06  
**Scope:** Planning only (no schema/workflow/code changes in this step).  
**App:** Quarbani 2026 (`qurbani-app`)

---

## 1. Current system findings

### 1.1 Data model (`prisma/schema.prisma`)

- **`Lead`:** Has `customerName`, `phone`, `whatsapp`, `address`, `googleMapUrl`, rich clinical/intake fields, `status` (`LeadStatus`), and **`assignedDoctorId`** → `User` (`AssignedDoctor`). There is **no** `claimedAt`, `claimedByDoctorId`, or `contactRevealedAt` field.
- **`LeadStatus` enum:** `NEW`, `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `OBSERVED`, `COMPLETED`, `CANCELLED`, `REFERRED`. There is **no** `CLAIMED` value; “claim” must map onto existing states (see §3).
- **`LeadAssignment`:** Rows with `leadId`, `doctorId`, `assignedAt`, `unassignedAt`, `assignedByUserId`. Created on doctor self-accept from pool and on admin assign. Useful as an **audit timeline** (including approximate “claim time” via `assignedAt` when tied to self-claim).
- **`LeadStatusHistory`:** `fromStatus`, `toStatus`, `actorKind`, `actorUserId`, `note`, `createdAt` — already used when a doctor accepts from pool (`note`: self-assign text).
- **`User` (doctors):** `phone`, `whatsapp`, `email`, profile fields (`qualification`, `shortBio`, `experienceSummary`, `profilePhotoUrl`, etc.).

### 1.2 Doctor lead visibility (`src/lib/doctor-lead-access.ts`)

- **`buildDoctorLeadWhere`:** A doctor sees leads that are either **assigned to them** (any area) **or** **unassigned** (`assignedDoctorId: null`) **and** `areaId` in their `DoctorArea` list.
- **Implication:** Multiple doctors in the same area can see the **same pool leads** in list and detail today. **`doctorCanAccessLead`** only checks this visibility rule — it does **not** distinguish “browse pool” vs “assigned / entitled to contact”.

### 1.3 Claim / assign behaviour (already partially implemented)

- **`POST /api/doctor/leads/[id]/accept`** (`src/app/api/doctor/leads/[id]/accept/route.ts`): For `NEW` + `assignedDoctorId === null`, uses **`updateMany`** with `assignedDoctorId: null` and `status: NEW` for **atomic** self-assign; sets `assignedDoctorId`, `status: ACCEPTED`, creates **`LeadAssignment`**, **`LeadStatusHistory`**, and a **`LeadNote`**. Conflict returns **409** with Bengali copy already aligned with “another doctor took it”.
- **Admin assign:** `PATCH /api/admin/leads/[id]/assign-doctor` sets `assignedDoctorId`, may set `status` to `ASSIGNED`, creates `LeadAssignment` and note; **unassign** (`doctorId: null`) clears assignee and may revert status toward `NEW`.

### 1.4 Where customer PII is exposed today (gaps vs target rules)

| Surface | Customer phone / WhatsApp / address / map | Notes |
|--------|---------------------------------------------|--------|
| `GET /api/doctor/leads` | **Returned** in JSON (`phone`, `whatsapp`) | Any doctor who can see the list gets numbers without claiming. |
| `GET /api/doctor/leads/[id]` | **Full lead** including contact + `assignedDoctor.phone/whatsapp` | Pool doctors get full customer PII before claim. |
| `src/app/doctor/leads/page.tsx` (RSC) | List + mobile cards: phone, call/WA links, **`googleMapUrl`** | Same visibility as API. |
| `src/app/doctor/leads/[id]/page.tsx` | Always shows call/WA/map and address block | No “pre-claim” masking. |
| `GET /api/admin/leads` | **`phone` in list select** | Admin list UI (`admin/requests`) shows phone and call/WA — stricter list rule asks to hide from **admin** list too; detail remains full. |
| `admin/requests/page.tsx` | Table/cards expose phone + actions | Align list with sanitised columns; keep detail rich. |

### 1.5 Doctor contact on public site

- **`getDoctorPreviews` / `DoctorPreview`** (`src/lib/landing-public-data.ts`, `src/components/landing/DoctorPreviewSection.tsx`): Selects **id, name, areas, experience blurb, completed count** — **no** phone/WhatsApp/email on landing cards today.
- **Risk:** Any future public doctor directory, JSON API, or “profile” page must use an explicit **allowlist** of fields; do not pass full `User` rows to public loaders.

### 1.6 Auth and middleware

- **`src/middleware.ts`:** Cookie JWT for `/admin`, `/api/admin`, `/doctor`, `/api/doctor`; login routes excluded.
- **`src/lib/auth-guards.ts`:** `requireAdminFromRequest` → **ADMIN or STAFF**; `requireDoctorFromRequest` → **DOCTOR** with `id`, `name`, `email`, `phone` for session user (doctor’s **own** contact — not the same as customer PII).

### 1.7 Secondary APIs (must align with contact rules)

- **`POST .../observations`:** Authorised with **`doctorCanAccessLead` only** — so a **non-assigned** pool doctor could theoretically post observations. **Recommendation:** Restrict mutating case data (observations, case report, complete, status changes) to **`assignedDoctorId === auth.user.id`** (and keep pool doctors on read-only summary until claim or admin assign).

---

## 2. Exact privacy rules (normative)

### 2.1 Public (unauthenticated + landing)

- **Never** show any doctor **phone, WhatsApp, email, or personal address** on public pages or public APIs.
- Doctor cards may show: **name**, **photo** (when wired), **qualification**, **experience**, **service areas**, **short bio** — from **sanitised DTOs** only.
- CTAs: **platform** request form, site WhatsApp/phone from **site settings**, not per-doctor direct MSISDN.

### 2.2 Admin / staff lead **list**

- Do **not** show customer **phone, WhatsApp, or full address** inline in the list.
- Show: **customer name**, **area**, **animal type/summary**, **problem summary** (category + short line if available), **emergency/priority badge**, **created time**, **status**, **assigned doctor** (name if any), **View/Handle** (or existing detail link).

### 2.3 Doctor lead **list**

- Same sanitised columns as above for **all** rows the doctor is allowed to see in the list (pool + mine).
- Optional: indicate **“আপনার কেস”** vs **“পুল”** via `assignedDoctorId === viewerId`.

### 2.4 Doctor lead **detail** — customer contact

Customer **phone**, **WhatsApp**, **exact address**, and **map/location** (`googleMapUrl` or any future lat/lng) visible **only** if:

- Viewer is **ADMIN** or **STAFF** (full admin portal per current model), **or**
- Viewer is a **DOCTOR** and **`lead.assignedDoctorId === doctor.id`**.

Otherwise the same doctor may still open the lead (pool preview) but sees **summary only** + **Claim** CTA + message if claimed by another doctor.

### 2.5 Claim semantics

- **Opening/viewing** a lead does **not** lock it.
- Explicit action only: **“এই কেসটি আমি নিচ্ছি”** / **“Claim Case”** (reuse existing accept endpoint behaviour where possible).
- After successful claim: set **`assignedDoctorId`**, status per §3, record history/assignment as today; **only that doctor** gets contact fields from APIs and server-rendered pages.

### 2.6 Admin

- **Detail:** Full customer + assigned doctor info; show **who is assigned** (`assignedDoctor` + optional latest `LeadAssignment` / history).
- **Release / reassign:** Already partially supported via **`assign-doctor`** with `doctorId: null` and PATCH on lead; plan UX copy and ensure **sanitised list** after changes.

---

## 3. Schema decision

**Preference: minimal Prisma changes for phase 1.**

| Need | Decision |
|------|----------|
| Who claimed / active handler | **`Lead.assignedDoctorId`** remains source of truth. |
| Claim timestamp | Use existing **`LeadAssignment.assignedAt`** (and/or **`LeadStatusHistory.createdAt`**) for audit; **no new column required** for MVP. |
| Separate `claimedByDoctorId` | **Not needed** if `assignedDoctorId` is authoritative. |
| `Lead.claimedAt` | **Optional later** if product wants a single indexed field for reporting; can be added in a small migration without changing workflow semantics. |
| `contactRevealedAt` / `ContactRevealLog` | **Phase 2 (optional):** derive “first contact view” from **`logOps`** events if implemented (see §5.4); dedicated table only if compliance asks for immutable audit. |

**Status mapping (no new enum value):**

- **Self-claim from pool (`NEW`, unassigned):** Keep **`ACCEPTED`** after claim (current behaviour) — this is the product’s “claimed / taken” state for doctors.
- **Admin-assigned lead:** Remains **`ASSIGNED`** until doctor accepts → **`ACCEPTED`** (existing accept path for `ASSIGNED` + same doctor).
- **“Claim” button label** can be Bengali primary string; backend continues to use **`accept`** route semantics.

---

## 4. Backend authorisation plan

**Principle:** Sensitive fields must be **omitted at the Prisma `select`/mapper layer** for unauthorised doctors. UI-only hiding is **not** sufficient.

### 4.1 Helper module (new, e.g. `src/lib/lead-privacy.ts`)

Suggested exports (names can match codebase style):

1. **`canViewLeadContact(actor, lead)`**  
   - `actor.role` in `ADMIN`, `STAFF` → `true`.  
   - `actor.role === DOCTOR` → `true` iff `lead.assignedDoctorId === actor.id`.

2. **`sanitizeLeadForDoctorList(lead)`**  
   - Returns DTO **without** `phone`, `whatsapp`, `address`, `googleMapUrl`, and other high-PII fields not needed for list columns.

3. **`sanitizeLeadForDoctorDetail(lead, actor)`**  
   - If `canViewLeadContact` → return full allowed shape (or full lead for doctor-of-record).  
   - Else → strip `phone`, `whatsapp`, `address`, `googleMapUrl` (and any future precise location). Keep clinical/summary fields agreed for triage (problem category, animal, service requirement text, priority, area name, status).

4. **`sanitizeAssignedDoctorForLead(assignedDoctor, viewer)`**  
   - For **doctor** viewers who are **not** the assigned doctor, **`assignedDoctor`** in JSON should expose at most **`id` + `name`** — **never** assignee’s phone/WhatsApp/email on pool preview (today `GET /api/doctor/leads/[id]` exposes assignee phone — fix when sanitising).

5. **`doctorCanBrowseLead(doctorUserId, leadId)`**  
   - Equivalent to current **`doctorCanAccessLead`** (visibility in area or assigned).

6. **`doctorCanClaimLead(doctorUserId, lead)`**  
   - `true` when: doctor passes area rules for **pool** leads, `assignedDoctorId == null`, `status === NEW`, not terminal — align with **`accept`** preconditions.

7. **`doctorCanMutateLeadCase(doctorUserId, lead)`**  
   - `true` iff `lead.assignedDoctorId === doctorUserId` (and non-terminal where applicable). Use for observations, case-report, complete, start-treatment, and doctor-driven status transitions.

**Admin list API:** Apply **`sanitizeLeadForAdminList`** (same fields stripped as doctor list) **or** reuse one DTO type for “list row” across admin and doctor.

### 4.2 Route-by-route intent

| Route / page | Change |
|--------------|--------|
| `GET /api/doctor/leads` | Return **list DTO** without customer phone/whatsapp; optionally add flags `isMine`, `canClaim`. |
| `GET /api/doctor/leads/[id]` | If browse allowed but no contact: **sanitised lead** + meta `{ contactVisible: false, assignedDoctor: { id, name } }`. If contact allowed: full fields + assignee contact only if product needs (admin-facing assignee contact stays on admin API). |
| `POST .../accept` | Keep **atomic** claim; optionally **`logOps('lead_claimed', { leadId, doctorUserId })`** (no raw phone). |
| `POST .../start-treatment`, `.../complete`, `.../case-report`, `.../status`, `.../observations` | Require **`doctorCanMutateLeadCase`** (not only browse). |
| `GET /api/admin/leads` | Strip phone/whatsapp/address from **list** payload; detail route unchanged. |
| `PATCH .../assign-doctor` | No PII leak change required; ensure responses used by doctor-facing clients are not reused. |

### 4.3 Server Components (`doctor/leads`, `doctor/leads/[id]`)

- Use the **same helpers** as APIs (single source of truth): either call helpers after `findUnique` / `findMany` or centralise in a small `getLeadForDoctorPage` loader that branches on `canViewLeadContact`.

---

## 5. Routes / actions (design)

| Action | Method / path | Auth | Behaviour |
|--------|----------------|------|-------------|
| Claim | Existing `POST /api/doctor/leads/[id]/accept` | Doctor | Keep; ensure UI uses explicit “এই কেসটি আমি নিচ্ছি” / “Claim Case”. |
| Release / unassign | Existing `PATCH .../assign-doctor` `doctorId: null` | Admin/Staff | Keep; document in admin UI as “রিলিজ / আনঅ্যাসাইন”. |
| Reassign | Same PATCH with new `doctorId` | Admin/Staff | Keep; creates new `LeadAssignment`. |
| Contact reveal (optional) | N/A for MVP | — | If added: single `GET` could log `logOps('lead_contact_viewed', { leadId, viewerRole, viewerId })` once per session or first expand — avoid noisy logs. |

**Lead detail fetch:** One pattern: load full row server-side, then **`sanitizeLeadForDoctorDetail`** before serialising to client components or passing props.

---

## 6. UI changes (by surface)

### 6.1 Public

- **Audit** all public data loaders for `User` / doctor selects — **allowlist** fields for any new doctor showcase.
- Landing **`DoctorPreviewSection`:** Already safe; add **photo/qualification** when available **without** contact fields.
- **CTAs:** Prefer **“অনুরোধ করুন”** / form hash links; site-level call/WA from settings only.

### 6.2 Doctor list (`src/app/doctor/leads/page.tsx`)

- Remove phone column, call/WA buttons, and map from **list** and **cards**.
- Add **assigned doctor name** (if any) and **View/Handle** → `/doctor/leads/[id]`.
- Show **problem summary** (existing `problemCategory` + optional truncated `serviceRequirement` or `problemDetails`).
- Keep **priority / emergency**, **status**, **createdAt**, **area**, **animal**.

### 6.3 Doctor detail (`src/app/doctor/leads/[id]/page.tsx`)

- **If** `assignedDoctorId === viewer.id` or admin: show **Call / WhatsApp / address / map** block (current behaviour).
- **Else if** pool (`assignedDoctorId == null`, claimable): show summary + primary **`এই কেসটি আমি নিচ্ছি`** (wired to existing accept POST); hide contact block.
- **Else** (assigned to other doctor): show **“এই কেসটি অন্য ডাক্তার নিয়েছেন”** (or reuse existing 409-style copy); summary only; no contact.

### 6.4 Doctor workflow panel (`DoctorLeadWorkflowPanel.tsx`)

- Align button labels with claim copy; ensure **accept** only shows when claimable; no contact dependency before claim.

### 6.5 Admin list (`src/app/admin/requests/page.tsx` + `GET /api/admin/leads`)

- Remove inline phone and call/WA from table/cards; match **§2.2** column set.
- **Detail** (`admin/leads/[id]`): unchanged information richness; show assigned doctor and claim/assign history via notes + `LeadStatusHistory` / assignments as needed.

### 6.6 Bengali copy (user-friendly)

- Claim: **“এই কেসটি আমি নিচ্ছি”** (primary); secondary English: “Claim case”.
- Taken by other: **“এই কেসটি অন্য ডাক্তার নিয়েছেন”** (align with existing accept error).
- Contact hidden: **“যোগাযোগের তথ্য কেস গ্রহণের পর দেখানো হবে”** or similar short line.

---

## 7. Implementation steps (ordered)

1. Add **`src/lib/lead-privacy.ts`** (or equivalent) with **`canViewLeadContact`**, **`sanitizeLeadForDoctorList`**, **`sanitizeLeadForDoctorDetail`**, **`doctorCanClaimLead`**, **`doctorCanMutateLeadCase`**, and admin list sanitiser; unit-test pure functions where possible.
2. Update **`GET /api/doctor/leads`** and **`GET /api/doctor/leads/[id]`** to use sanitisation + assignee doctor redaction.
3. Tighten **mutating** doctor routes from **`doctorCanAccessLead`** to **`doctorCanMutateLeadCase`** where appropriate (observations, case-report, status, complete, start-treatment).
4. Refactor **`src/app/doctor/leads/page.tsx`** and **`[id]/page.tsx`** to use the same rules (import helpers; conditional render).
5. Update **`GET /api/admin/leads`** and **`admin/requests/page.tsx`** list queries/selects to match list privacy rules.
6. **Regression pass:** admin assign/unassign, doctor accept conflict, emergency leads, assigned-then-accept path.
7. **(Optional phase 2)** `logOps` for first successful contact-bearing page load; or `ContactRevealLog` if required.

---

## 8. Risk notes

- **Dual data paths:** Any **new** client fetch or Server Action that returns `Lead` must go through sanitisation — grep for `prisma.lead.find` in doctor routes.
- **Notifications:** In-app / WhatsApp templates that embed customer phone for **broadcast to wrong doctor** must only run for **assigned** doctor flows (review `queueInAppNotification` call sites for pool leakage).
- **STAFF vs ADMIN:** Both can see full contact on admin detail per current guards; if policy changes later, split inside **`canViewLeadContact`** for staff.
- **Performance:** Extra branching is negligible; avoid N+1 by keeping a single `findUnique` then strip fields in memory.
- **LeadAssignment history:** Multiple rows per lead possible; UI “who claimed” should prefer **`Lead.assignedDoctor`** + latest relevant **`LeadAssignment`** where `unassignedAt` is null, plus **`LeadStatusHistory`** for narrative.

---

## 9. Test checklist

- [ ] Pool doctor: **list** JSON and HTML **exclude** phone, WhatsApp, address, map URL.
- [ ] Pool doctor: **detail** before claim shows **Claim** and **no** tel/wa/map/address in HTML and network JSON.
- [ ] Pool doctor: **`POST /accept`** succeeds; after reload, **contact visible**; another doctor in same area **cannot** accept (409).
- [ ] Non-assigned doctor: **`POST .../observations`** (and other mutators) returns **403** if claim is required first.
- [ ] Assigned doctor: all mutating endpoints behave as today.
- [ ] Admin list: **no** phone column in table/API; **detail** still shows full PII.
- [ ] Admin **unassign**: lead returns to pool; doctors lose contact again until re-claim/reassign.
- [ ] Public landing / doctor preview: **no** doctor phone, WhatsApp, email in HTML source.
- [ ] **`GET /api/doctor/leads/[id]`** when another doctor is assigned: response **excludes** customer PII and **redacts** assigned doctor’s phone/email/whatsapp.

---

## 10. Summary

The app already has **atomic self-claim** (`accept`) and **`assignedDoctorId`**. The main gap is **authorisation and DTO shaping**: pool doctors can **read** full customer contact and can **mutate** some resources too broadly. Fix by central **`canViewLeadContact` + sanitise** for all doctor list/detail/API paths, tighten **mutate** guards to **assigned doctor only**, align **admin list** with list-level privacy, and keep public doctor data on a **strict allowlist**. **Schema changes are optional** for MVP; use **`LeadAssignment` / `LeadStatusHistory`** for audit timestamps.

---