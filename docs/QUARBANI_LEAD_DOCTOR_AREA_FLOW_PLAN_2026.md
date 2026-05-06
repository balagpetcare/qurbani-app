# Quarbani 2026 — Lead, Area, Doctor & Application Flow Plan

**Scope:** This document applies only to the **Quarbani 2026** app (`qurbani-app`). It does not cover BPA/WPA, Bangladesh Pet Association, pet clinic/shop/POS, vaccine, inventory, or producer modules.

**Purpose:** Plan customer leads, database-backed service areas, doctor accounts (separate from admin), doctor applications, admin analytics, data model changes, APIs/routes, and phased implementation — aligned with the **current codebase** as inspected.

---

## Current state (baseline inspection)

### Project shape

- **Stack:** Next.js (App Router), React 19, Prisma 7, PostgreSQL, Tailwind CSS 4.
- **Entry:** Public landing at `/` with lead form; thank-you at `/thank-you`.
- **Admin:** `/admin` (dashboard), `/admin/leads` (paginated list), `/admin/leads/[id]`, `/admin/doctors`, `/admin/notifications`, `/admin/login`.
- **Doctor UI:** `/doctor/leads` — currently **unauthenticated**; doctor identity is chosen via query param `?doctorId=` (testing/MVP pattern).

### Prisma / data (today)

- **`User`:** `UserRole` enum includes `ADMIN`, `DOCTOR`, `STAFF`. Doctors are rows with `role = DOCTOR`. Fields include `name`, `phone`, `email`, `whatsapp`, `passwordHash` (optional), `isActive`, `areaCoverage` (**free-text**), `emergencyAvailable`, `notes`, `createdAt` (implicit via Prisma), **no `updatedAt` on User**.
- **`Lead`:** `customerName`, `phone`, `whatsapp`, `area` (**string, not FK**), `animalType`, `animalCount`, `preferredDate`, `message`, `status` (`LeadStatus` enum), `assignedDoctorId` → `User`, UTM/landing fields, duplicate detection, `createdAt`, `updatedAt`.
- **`LeadNote`:** Simple notes on a lead (`note`, `createdBy`, `createdAt`).
- **`Notification`:** In-app notification rows for ops (e.g. new lead).
- **Missing vs target:** No `Area` table, no `DoctorArea` join, no `DoctorApplication`, no structured **treatment/observation** history beyond notes + status changes.

### Auth (today)

- **Admin:** HTTP-only cookie `qurbani_admin_session` with fixed value `valid` after successful `POST /api/admin/login` (bcrypt against DB admin or env fallback). Middleware protects `/admin/*` and `/api/admin/*`.
- **Doctor:** **No dedicated login or session.** Doctor quick-status UI calls `PATCH /api/admin/leads/[id]/status` — i.e. **admin API** — which is inconsistent with a secure doctor role (see risks below).

### Lead ordering (today)

- **`/admin/leads`** uses `orderBy: { createdAt: "desc" }` — **newest first** (with pagination). Matches requirement once filters are applied.

### Gaps vs desired product

| Area | Gap |
|------|-----|
| Customer address | Not captured as dedicated fields (only `area` text + message). |
| Service/treatment | Bundled in `message`; no dedicated field. |
| Preferred time | Only `preferredDate` exists; no time-of-day field. |
| Areas | Not in DB; landing uses hardcoded list in `AreaCoverageSection`; form uses free-text `area`. |
| Doctor–area matching | `areaCoverage` is one string; no multi-area normalized mapping to leads. |
| Doctor login | Not implemented; `/doctor/leads` is public with `doctorId`. |
| Doctor CRUD | Create via API + form; **no** edit/delete endpoints or UI observed. |
| Doctor stats | No doctor-wise lead/observation/completed/pending/cancelled aggregates. |
| Doctor applications | No model or pages. |
| Observations / visits | No `LeadObservation` / treatment record; only `LeadNote` + status. |

---

## 1. Customer lead flow (target)

### Intended journey

1. Customer submits a **public form** (landing).
2. **`POST /api/leads`** (or successor) creates a **Lead** with validation (phone normalization already exists).
3. **Admin list** (`/admin/leads`): **newest first** (`createdAt desc`) — already the default; preserve when adding area FK and filters.
4. Each lead should expose (conceptually):

   | Field | Current | Target note |
   |--------|---------|-------------|
   | Customer name | `customerName` | Keep |
   | Phone | `phone` | Keep |
   | WhatsApp | `whatsapp` | Keep |
   | Address | — | Add structured fields (e.g. `addressLine`, `city`, or single `address` text) |
   | Selected area | `area` string | Move to **`areaId` FK → Area** (keep migration path from text) |
   | Animal type / count | `animalType`, `animalCount` | Keep |
   | Service / treatment requirement | `message` | Optionally split `serviceRequirement` or keep message + label |
   | Preferred time | `preferredDate` only | Add `preferredTime` (time string or minutes-from-midnight) or combined `preferredSlot` |
   | Note | `message` / notes | Clarify: customer note vs internal notes (`LeadNote`) |
   | Status | `Lead.status` | Keep / extend enum if needed |
   | Assigned doctor | `assignedDoctorId` | Keep |
   | Timestamps | `createdAt`, `updatedAt` | Keep |

5. **Notifications:** Existing `Notification` creation on new lead can remain; extend types if doctor-assignment alerts are needed.

### Ordering rule

- Default sort: **`createdAt DESC`**. Document explicitly for any future “request queue” views (doctor inbox by area).

---

## 2. Area system (target)

### Requirements

- **Persist areas** in the database (`Area` model).
- **Seed/migrate** initial Quarbani service areas (baseline copy can start from the landing constant list in `AreaCoverageSection`: e.g. Mirpur, Uttara, Rampura, Badda, Gulshan, Banani, Mohammadpur, Jatrabari, Keraniganj, Savar nearby — adjust Bengali/English display names as product dictates).
- **Customer:** Area must be **searchable/selectable** (combobox/autocomplete or select populated from `GET /api/areas` public read).
- **Doctors:** **Multiple** work areas per doctor → **`DoctorArea`** (or implicit many-to-many).
- **Visibility rule:** When a customer selects `areaId`, **doctors who cover that area** should see the lead in their inbox — **even before assignment**, if product confirms (pool model). Alternative stricter model: only **assigned** doctor sees full workflow; area filter only for **routing suggestions**. **Recommendation:** implement **area pool**: leads visible to all covering doctors; **assignment** still uses `assignedDoctorId` for accountability; admin sees **all** leads.

### Admin

- Admin continues to see **all leads** (no area restriction).

### Migration strategy

- Add `Area` + seed.
- Add nullable `Lead.areaId`; backfill: fuzzy match `Lead.area` text to `Area.name` / `Area.slug` where possible; leave null for unmappable legacy rows.
- Deprecate free-text `Lead.area` after transition (or keep as display override for legacy).

---

## 3. Doctor system (target)

### Admin-created doctors

- **Manual create** (already partially: `POST /api/admin/doctors` + `DoctorForm`).
- **Fields (target):**

  | Field | Current `User` | Action |
  |--------|----------------|--------|
  | name | ✓ | Keep |
  | email | ✓ | Required for login if email login |
  | password | `passwordHash` exists but not set on doctor create | **Set on create** or invite flow |
  | phone | ✓ | Keep |
  | WhatsApp | ✓ | Keep |
  | active/inactive | `isActive` | Keep |
  | covered areas | `areaCoverage` text | Replace with **DoctorArea → Area** |
  | notes | ✓ | Keep |
  | createdAt / updatedAt | partial | Add **`updatedAt`** on `User` or dedicated profile |

### Login

- **Separate doctor session** from admin:

  - Option A: **Different cookie name** (e.g. `qurbani_doctor_session`) + JWT/subject with `userId` + role check.
  - Option B: **Shared session cookie** with signed payload containing `role` (harder to keep minimal).

- **`POST /api/doctor/login`** (new): authenticate `User` where `role === DOCTOR` and `isActive`, bcrypt `passwordHash`.

- **Middleware:** Extend matcher to protect `/doctor/*` (except `/doctor/login`) and `/api/doctor/*`.

### Authorization

- **Admin APIs:** Reject `DOCTOR` role (403).
- **Doctor APIs:** Allow `DOCTOR` only for scoped operations; **never** full admin CRUD unless explicitly granted.

### Lead visibility (target)

- Doctor sees leads where:

  - `(Lead.areaId IN doctor's areas)` **OR** `(Lead.assignedDoctorId = doctor.id)` — exact rule to finalize (pool vs assigned-only).

- Doctor opens lead detail at **`/doctor/leads/[id]`** (new) with **update treatment workflow** (status + observations — see §6).

### Current risk (must fix in implementation phase)

- Doctor UI must **not** call `/api/admin/*` without admin auth. Replace with **`/api/doctor/leads/...`** guarded by doctor session.

---

## 4. Doctor application form (public)

### Public form

- New route e.g. **`/join-doctor`** or **`/doctor/apply`** with client form posting to **`POST /api/doctor-applications`** (public, rate-limited).

### Applicant fields

- name, phone, WhatsApp, email, address, experience, qualification, **selected work areas** (multi `areaId`), note, **status** (server-side default `PENDING`).

### Admin review

- **`/admin/doctor-applications`** list + detail.
- Actions: **Approve / Reject / Request info**; optional **“Create doctor account”** from applicant — pre-fills `User` (role DOCTOR) + areas + temporary password or invite.

---

## 5. Admin features (target)

### Doctor CRUD

- **Create:** Already exists; extend with password + multi-area.
- **Read:** List + detail.
- **Update:** `PATCH /api/admin/doctors/[id]` — edit fields, toggle `isActive`, update areas.
- **Delete:** Soft-delete preferred (`isActive = false`) or hard-delete with audit log; document choice.

### Doctor-wise metrics

- Per doctor (and totals on dashboard):

  - Lead count (assigned or area-touched — define metric),
  - **Observation count** (`LeadObservation` rows),
  - Completed count (`status === COMPLETED`),
  - Pending count (e.g. `NEW`, `ASSIGNED`, `CONTACTED`, `VISIT_SCHEDULED` — define),
  - Cancelled count.

- Implementation: Prisma `groupBy` / aggregated queries; optional materialized rollups later.

### Visibility / audit

- Admin view: **which doctor** visited/observed **which lead/patient**, **current condition/status**:

  - Drive from **`Lead.status`** + latest **`LeadObservation`** + timeline of observations.

---

## 6. Database design (Prisma) — suggested models / changes

> Exact names can be adjusted; relationships should remain as below.

### `Area`

```prisma
model Area {
  id          Int      @id @default(autoincrement())
  slug        String   @unique   // e.g. "mirpur"
  name        String              // display
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  doctors     DoctorArea[]
  leads       Lead[]
  applications DoctorApplicationArea[] // if M:N applications–areas
}
```

### `DoctorArea` (join)

```prisma
model DoctorArea {
  userId  Int
  areaId  Int
  user    User @relation(fields: [userId], references: [id], onDelete: Cascade)
  area    Area @relation(fields: [areaId], references: [id], onDelete: Cascade)

  @@id([userId, areaId])
}
```

### `User` (extend existing)

- Add `updatedAt DateTime @updatedAt` if missing.
- Keep `role`; doctors remain `UserRole.DOCTOR`.
- Remove or phase out `areaCoverage` after `DoctorArea` is live.
- Ensure unique constraints: `email`, `phone` as today.

### `Lead` (extend)

- `areaId Int?` + `area Area? @relation(...)`
- Optional: `address` / `addressLine1`, `city`
- Optional: `serviceRequirement String?` or keep using `message`
- Optional: `preferredTime` / `preferredSlot`
- Keep `assignedDoctorId`, status, timestamps.

### `DoctorApplication`

```prisma
enum DoctorApplicationStatus {
  PENDING
  REVIEWING
  APPROVED
  REJECTED
}

model DoctorApplication {
  id             Int      @id @default(autoincrement())
  name           String
  phone          String
  whatsapp       String?
  email          String?
  address        String?
  experience     String?
  qualification  String?
  note           String?
  status         DoctorApplicationStatus @default(PENDING)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  reviewedAt     DateTime?
  reviewedByUserId Int?

  areas          DoctorApplicationArea[]
  createdUserId    Int?     // if promoted to User
}
```

Many-to-many `DoctorApplicationArea` (`applicationId`, `areaId`) if multi-select areas.

### `LeadObservation` (or `TreatmentRecord`)

```prisma
model LeadObservation {
  id          Int      @id @default(autoincrement())
  leadId      Int
  lead        Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  doctorId    Int
  doctor      User     @relation(fields: [doctorId], references: [id])
  condition   String?           // current condition / findings
  status      LeadStatus?       // optional snapshot or next recommended status
  note        String?
  visitedAt   DateTime @default(now())
  createdAt   DateTime @default(now())

  @@index([leadId, visitedAt])
}
```

Keeps **audit trail** separate from ad-hoc `LeadNote` (which can remain for admin/internal blurbs).

### `LeadAssignment` (optional)

- Only needed if you track **history** of assignments (reassignments). Otherwise `Lead.assignedDoctorId` + observations suffice.

```prisma
model LeadAssignment {
  id         Int      @id @default(autoincrement())
  leadId     Int
  doctorId   Int
  assignedAt DateTime @default(now())
  assignedByUserId Int?
  unassignedAt DateTime?
}
```

### Notifications

- Optionally extend `NotificationType` for doctor-facing events.

---

## 7. API / route design

### Public

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/leads` | Create lead (extend body with `areaId`, address, preferred time, etc.) |
| GET | `/api/areas` | List active areas for form selects (cached) |
| POST | `/api/doctor-applications` | Submit doctor application |

### Admin (existing cookie; role ADMIN only)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/login` | Unchanged pattern; ensure role check stays ADMIN-only |
| GET/POST | `/api/admin/doctors` | List / create (extend) |
| PATCH | `/api/admin/doctors/[id]` | Update doctor |
| DELETE | `/api/admin/doctors/[id]` | Deactivate or delete |
| GET/PATCH | `/api/admin/leads/...` | Existing notes, status, assign |
| GET/PATCH | `/api/admin/doctor-applications/[id]` | Review / approve / create user |

### Doctor (new session)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/doctor/login` | Doctor login |
| POST | `/api/doctor/logout` | Clear doctor cookie |
| GET | `/api/doctor/leads` | List leads for logged-in doctor (area + assignment rules) |
| GET | `/api/doctor/leads/[id]` | Lead detail (scoped) |
| PATCH | `/api/doctor/leads/[id]/status` | Status transitions allowed for doctors |
| POST | `/api/doctor/leads/[id]/observations` | Add `LeadObservation` |

### Frontend pages (target)

| Route | Role |
|-------|------|
| `/` | Public |
| `/thank-you` | Public |
| `/join-doctor` (or similar) | Public application |
| `/admin/...` | Admin |
| `/admin/doctor-applications` | Admin |
| `/doctor/login` | Doctor guest |
| `/doctor/leads`, `/doctor/leads/[id]` | Doctor (authenticated; remove `doctorId` query hack) |

---

## 8. Implementation order (phased, low-risk)

### Phase 0 — Safety & contracts

- Document lead visibility rule (pool vs assigned-only) and stick to it in queries.
- Stop doctor UI from depending on unauthenticated admin APIs (even before full auth, gate or stub).

### Phase 1 — Areas

- Add `Area`, `DoctorArea`, seed migration.
- Public `GET /api/areas`.
- Update lead form to select `areaId`; migrate `Lead.area` → `areaId`.

### Phase 2 — Doctor authentication

- Doctor login/logout, cookie/session, middleware for `/doctor/*` + `/api/doctor/*`.
- Replace `?doctorId=` prototype with session user id.

### Phase 3 — Doctor lead inbox & workflow

- Implement doctor-scoped list/detail APIs.
- Add `LeadObservation` (and doctor POST endpoint).
- UI: doctor lead detail with timeline (observations + status).

### Phase 4 — Admin doctor CRUD & metrics

- PATCH/DELETE (or deactivate) doctors; multi-area editor.
- Admin dashboard: doctor-wise counts + drill-down links.

### Phase 5 — Doctor applications

- `DoctorApplication` model, public form, admin review, promote to `User`.

### Phase 6 — Hardening

- Rate limits on public POST endpoints, audit fields on promotions, optional email/SMS notifications.

---

## Appendix: File index (relevant to this plan)

| Area | Paths |
|------|--------|
| Schema | `prisma/schema.prisma` |
| Seed | `prisma/seed.ts` (admin + areas upsert) |
| Public lead API | `src/app/api/leads/route.ts` |
| Areas API | `src/app/api/areas/route.ts` |
| Lead form UI | `src/components/landing/LeadForm.tsx` |
| Admin leads | `src/app/admin/leads/page.tsx`, `src/lib/admin-leads-search.ts` |
| Middleware / auth | `src/middleware.ts`, `src/lib/auth-token.ts`, `src/lib/auth-guards.ts` |
| Admin login | `src/app/api/admin/login/route.ts` |
| Doctors API | `src/app/api/admin/doctors/route.ts`, `src/app/api/admin/doctors/[id]/route.ts`, `src/app/api/admin/doctors/[id]/areas/route.ts`, `src/app/api/admin/doctors/performance/route.ts` |
| Doctor UI | `src/app/doctor/leads/page.tsx`, `src/app/doctor/login/page.tsx`, `src/lib/doctor-server-session.ts` |
| Doctor APIs | `src/app/api/doctor/*/route.ts` |
| Area marketing list | `src/components/landing/AreaCoverageSection.tsx` |

---

## Backend implementation log (2026)

### Migrations applied

| Folder | Purpose |
|--------|---------|
| `prisma/migrations/20260506200000_qurbani_areas_workflow` | `Area`, `DoctorArea`, `DoctorApplication`, `DoctorApplicationArea`, `LeadObservation`, `LeadAssignment`; `Lead` gains `areaId`, `serviceRequirement`, `address`, `preferredTime`; `LeadStatus` migrated to `NEW`, `IN_PROGRESS`, `OBSERVED`, `COMPLETED`, `CANCELLED`; `User.updatedAt`; initial area rows in SQL |
| `prisma/migrations/20260507120000_user_updated_at_drop_default` | Drops DB default on `User.updatedAt` (Prisma `@updatedAt` handles updates) |

### Environment

- **`SESSION_SECRET`**: Required in production for signed cookie `qurbani_auth` (HMAC). A dev fallback exists; set a strong secret in production.

### Auth cookie

- **`qurbani_auth`**: Signed payload `{ sub, role, exp }` via `src/lib/auth-token.ts`.
- Replaces the legacy static-value admin cookie for middleware role checks (admins may need to log in again after deploy).

### HTTP API summary (Next.js route handlers under `/api`)

**Public**

| Method | Path |
|--------|------|
| GET | `/api/areas` |
| POST | `/api/leads` |
| POST | `/api/doctor-applications` |

**Admin** (requires `role=ADMIN` session)

| Method | Path |
|--------|------|
| POST | `/api/admin/login`, GET `/api/admin/logout` |
| GET | `/api/admin/leads`, `/api/admin/leads/[id]` |
| PATCH | `/api/admin/leads/[id]` |
| DELETE | `/api/admin/leads/[id]` |
| PATCH | `/api/admin/leads/[id]/status`, `/api/admin/leads/[id]/assign-doctor`, `/api/admin/leads/[id]/notes` |
| GET / POST | `/api/admin/doctors` |
| GET / PATCH / DELETE | `/api/admin/doctors/[id]` |
| PUT | `/api/admin/doctors/[id]/areas` |
| GET | `/api/admin/doctors/performance` |
| GET | `/api/admin/doctor-applications` |
| GET / PATCH | `/api/admin/doctor-applications/[id]` |
| POST | `/api/admin/doctor-applications/[id]/convert` |

**Doctor** (requires `role=DOCTOR` session)

| Method | Path |
|--------|------|
| POST | `/api/doctor/login`, GET/POST `/api/doctor/logout` |
| GET | `/api/doctor/leads`, `/api/doctor/leads/[id]`, `/api/doctor/my-stats` |
| PATCH | `/api/doctor/leads/[id]/status` |
| POST | `/api/doctor/leads/[id]/observations` |

### Test checklist

1. Run migrations and seed: `npx prisma migrate dev`, `npm run db:seed`.
2. Admin login at `/admin/login` — cookie `qurbani_auth` set; `/admin` loads.
3. `GET /api/areas` returns JSON without auth.
4. Submit landing lead with `areaId` + `serviceRequirement` — `POST /api/leads` returns 201.
5. Create doctor via `/admin/doctors` form (email, password, ≥1 area) — doctor can log in at `/doctor/login`.
6. `/doctor/leads` shows leads for doctor’s areas **or** assigned leads; quick status calls `/api/doctor/leads/[id]/status`.
7. `POST /api/doctor/leads/[id]/observations` creates an observation; visible on admin lead detail.
8. `GET /api/admin/doctors/performance` returns per-doctor stats (admin only).
9. `npm run typecheck`, `npm run lint`, `npm run build` pass.

---

## Frontend implementation log (2026)

### Canonical routes

| Path | Audience | Purpose |
|------|----------|---------|
| `/` | Public | Landing + lead form (searchable area), footer link to doctor apply |
| `/thank-you` | Public | Success + optional `?leadId=` reference |
| `/doctor/apply` | Public | Doctor application form (multi-area JSON submit) |
| `/admin/requests` | Admin | Lead/request list (newest first), filters, WhatsApp column; **`/admin/leads` redirects here** |
| `/admin/leads/[id]` | Admin | Lead detail (status, assign doctor, observations, notes) |
| `/admin/doctors` | Admin | Doctor list, activate/deactivate, link to create/edit |
| `/admin/doctors/new` | Admin | Create doctor (searchable multi-area) |
| `/admin/doctors/[id]/edit` | Admin | Edit doctor profile + covered areas |
| `/admin/doctor-applications` | Admin | Applications list; filters `?status=` & `?areaId=` |
| `/admin/doctor-applications/[id]` | Admin | Application detail; approve/reject/review; convert to doctor user |
| `/admin/reports` | Admin | Doctor performance table (areas, lead counts, observations, last activity) |
| `/doctor` | Doctor | Dashboard (counts + recent leads) |
| `/doctor/leads` | Doctor | Area/assignment leads; links to doctor detail |
| `/doctor/leads/[id]` | Doctor | Lead detail: status, observations, read-only team notes |

### Key frontend files touched / added

- **Areas UX:** `src/components/forms/SearchableAreaSelect.tsx`, `SearchableAreaMultiSelect.tsx`
- **Public:** `src/components/landing/LeadForm.tsx`, `DoctorApplicationForm.tsx`, `src/app/doctor/apply/page.tsx`, `src/app/page.tsx` (footer)
- **Admin:** `src/app/admin/requests/page.tsx`, `src/app/admin/leads/page.tsx` (redirect), `src/components/admin/AdminNav.tsx`, `AdminLeadsFilterForm.tsx`, `DoctorForm.tsx`, `DoctorEditForm.tsx`, `DoctorActiveToggle.tsx`, `DoctorApplicationActions.tsx`, `src/app/admin/doctors/page.tsx`, `src/app/admin/doctors/new/page.tsx`, `src/app/admin/doctors/[id]/edit/page.tsx`, `src/app/admin/doctor-applications/page.tsx`, `src/app/admin/doctor-applications/[id]/page.tsx`, `src/app/admin/reports/page.tsx`
- **Doctor:** `src/app/doctor/page.tsx`, `src/app/doctor/leads/[id]/page.tsx`, `src/app/doctor/leads/page.tsx`, `DoctorLeadsNav.tsx`, `DoctorLeadStatusEditor.tsx`, `DoctorObservationForm.tsx`
- **Shared:** `src/lib/admin-routes.ts`, `src/lib/admin-leads-search.ts` (area filter includes selected `Area` name/Bn), `src/middleware.ts` (public `/doctor/apply`)
- **API (minor):** `src/app/api/admin/doctor-applications/route.ts` (optional `areaId` filter), `src/app/api/admin/doctors/[id]/route.ts` (imports fix)

### Manual browser test checklist

1. **Landing:** Load `/` — area combobox search works; submit lead → `/thank-you?leadId=` shows reference.
2. **Doctor apply:** `/doctor/apply` — multi-area select; submit → success card with reference id.
3. **Admin requests:** `/admin/requests` — newest first; filter by name/phone/area/status; open detail `/admin/leads/[id]`; WhatsApp links open `wa.me`.
4. **Admin doctors:** `/admin/doctors` → **নতুন ডাক্তার** → create; **সম্পাদনা** → edit areas + profile; **নিষ্ক্রিয়** / **সক্রিয় করুন**.
5. **Applications:** `/admin/doctor-applications` — filter by status and area; detail → review/approve/reject → convert with password → lands on doctor edit.
6. **Reports:** `/admin/reports` — table loads; doctor name links to edit; last lead links to admin lead detail.
7. **Doctor:** Log in at `/doctor/login` → `/doctor` dashboard → `/doctor/leads` → open `/doctor/leads/[id]` → change status, add observation, mark completed; **লগআউট**.

### Role-based test checklist

| Role | Must access | Must not access |
|------|-------------|-----------------|
| Public (no login) | `/`, `/thank-you`, `/doctor/apply`, `/doctor/login`, `/admin/login` | `/admin/*` (except login), `/doctor/*` except login & apply |
| Admin | `/admin/*`, `/admin/requests`, lead detail, doctors CRUD, applications, reports | `/doctor/*` (doctor panel — use doctor account separately) |
| Doctor | `/doctor`, `/doctor/leads`, `/doctor/leads/[id]` | `/admin/*` (middleware redirects to admin login) |

---

## Final QA sign-off (2026)

### Completed checklist

**Customer flow**

- Public landing form loads; areas load from `GET /api/areas`.
- Searchable area select filters DB-backed areas (`SearchableAreaSelect`).
- Submit calls `POST /api/leads`; redirects to `/thank-you` with optional `leadId`.
- Admin requests list (`/admin/requests`) sorts **`createdAt: desc`** (newest first).

**Admin flow**

- Login at `/admin/login` sets signed cookie `qurbani_auth`.
- Full lead visibility via `/admin/requests` + filters; detail at `/admin/leads/[id]`.
- Doctors: create `/admin/doctors/new`, edit `/admin/doctors/[id]/edit`, searchable multi-area coverage.
- Activate/deactivate via UI (`DoctorActiveToggle`) → `PATCH` / `DELETE` on `/api/admin/doctors/[id]` (**DELETE deactivates only** — no hard delete).
- Doctor applications: list + detail; approve / reject / reviewed; convert via `/api/admin/doctor-applications/[id]/convert`.
- Reports: `/admin/reports` (Prisma aggregates; doctor names link to edit; sample lead to detail).

**Doctor flow**

- Login `/doctor/login`; dashboard `/doctor`; lists `/doctor/leads`; detail `/doctor/leads/[id]`.
- Visibility: `buildDoctorLeadWhere` — assigned **or** lead `areaId` in doctor’s `DoctorArea` rows (`src/lib/doctor-lead-access.ts`).
- Observations `POST /api/doctor/leads/[id]/observations`; status `PATCH .../status`; “চিকিৎসা সম্পন্ন” sets `COMPLETED`.
- Admin routes blocked: middleware requires `ADMIN`; doctor session redirected from `/admin/*`.

**Security**

- Public: `/`, `/thank-you`, `/doctor/apply`, auth endpoints (`/api/admin/login`, etc.) outside strict role gates as configured in `middleware.ts`.
- `/api/admin/*` requires **ADMIN** cookie; `/api/doctor/*` requires **DOCTOR**.
- Lead detail APIs use `doctorCanAccessLead` before returning data.
- Passwords: bcrypt (see `POST /api/admin/login`, doctor/admin create routes).

**UI**

- Bengali-first labels on forms; empty/error/success patterns on major flows.
- WhatsApp: `wa.me` links where phone can be normalized (`phoneToWhatsAppNumber`).
- Responsive tables + mobile card/list variants on admin requests and doctors lists.

### Known limitations

| Topic | Detail |
|-------|--------|
| **Doctor “delete”** | API `DELETE /api/admin/doctors/[id]` sets **`isActive: false`** only — safe soft-delete; **no** hard remove of `User` rows. |
| **Migration drift** | If `prisma migrate status` reports divergence between local migration folders and DB history (e.g. renamed migrations), resolve with `prisma migrate resolve` or baseline the DB before production — **fix the DB**, not the app logic in isolation. |
| **Notifications** | Queue UI is informational; delivery channels are **not** fully wired (subtitle on notifications page). |
| **Cross-role UX** | Admin users visiting `/doctor/*` are redirected to doctor login — use a dedicated doctor account for doctor QA. |

### Test login flow (local)

**Admin**

1. Ensure `.env` has **`DATABASE_URL`**, **`SESSION_SECRET`**, and **`ADMIN_SEED_PASSWORD`** (required for seed).
2. Optional: `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PHONE` (defaults exist in `prisma/seed.ts`).
3. Run: `npm run db:seed` — note stdout for admin **email** and **phone**.
4. Open **`/admin/login`** → sign in with **email or phone** + **`ADMIN_SEED_PASSWORD`**.

**Doctor**

1. As admin: **`/admin/doctors/new`** → create doctor with **email**, **password** (≥8 chars), **≥1 area**.
2. Sign out admin → **`/doctor/login`** → same **email + password** as created.
3. Alternative: approve a doctor application → **convert** → then log in with new credentials.

### QA commands executed

| Command | Result |
|---------|--------|
| `npx prisma generate` | OK |
| `npx prisma validate` | OK |
| `npx prisma migrate status` | **Drift reported** on this machine (see Known limitations) |
| `npm run db:seed` | OK (requires `ADMIN_SEED_PASSWORD`) |
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |

### Source file inventory (`src/` TypeScript)

All `.ts` / `.tsx` files under `src/` as of QA (83 files):

`src/app/admin/doctor-applications/[id]/page.tsx`, `src/app/admin/doctor-applications/page.tsx`, `src/app/admin/doctors/[id]/edit/page.tsx`, `src/app/admin/doctors/new/page.tsx`, `src/app/admin/doctors/page.tsx`, `src/app/admin/leads/[id]/not-found.tsx`, `src/app/admin/leads/[id]/page.tsx`, `src/app/admin/leads/page.tsx`, `src/app/admin/login/AdminLoginClient.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/notifications/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/reports/page.tsx`, `src/app/admin/requests/page.tsx`, `src/app/api/admin/doctor-applications/[id]/convert/route.ts`, `src/app/api/admin/doctor-applications/[id]/route.ts`, `src/app/api/admin/doctor-applications/route.ts`, `src/app/api/admin/doctors/[id]/areas/route.ts`, `src/app/api/admin/doctors/[id]/route.ts`, `src/app/api/admin/doctors/performance/route.ts`, `src/app/api/admin/doctors/route.ts`, `src/app/api/admin/leads/[id]/assign-doctor/route.ts`, `src/app/api/admin/leads/[id]/notes/route.ts`, `src/app/api/admin/leads/[id]/route.ts`, `src/app/api/admin/leads/[id]/status/route.ts`, `src/app/api/admin/leads/route.ts`, `src/app/api/admin/login/route.ts`, `src/app/api/admin/logout/route.ts`, `src/app/api/areas/route.ts`, `src/app/api/doctor-applications/route.ts`, `src/app/api/doctor/leads/[id]/observations/route.ts`, `src/app/api/doctor/leads/[id]/route.ts`, `src/app/api/doctor/leads/[id]/status/route.ts`, `src/app/api/doctor/leads/route.ts`, `src/app/api/doctor/login/route.ts`, `src/app/api/doctor/logout/route.ts`, `src/app/api/doctor/my-stats/route.ts`, `src/app/api/leads/route.ts`, `src/app/doctor/apply/page.tsx`, `src/app/doctor/leads/[id]/page.tsx`, `src/app/doctor/leads/page.tsx`, `src/app/doctor/login/DoctorLoginClient.tsx`, `src/app/doctor/login/page.tsx`, `src/app/doctor/page.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/thank-you/page.tsx`, `src/components/admin/AdminLeadsFilterForm.tsx`, `src/components/admin/AdminNav.tsx`, `src/components/admin/AssignDoctorForm.tsx`, `src/components/admin/DoctorActiveToggle.tsx`, `src/components/admin/DoctorApplicationActions.tsx`, `src/components/admin/DoctorEditForm.tsx`, `src/components/admin/DoctorForm.tsx`, `src/components/admin/LeadNoteForm.tsx`, `src/components/admin/LeadStatusBadge.tsx`, `src/components/admin/LeadStatusForm.tsx`, `src/components/doctor/DoctorLeadQuickStatus.tsx`, `src/components/doctor/DoctorLeadStatusEditor.tsx`, `src/components/doctor/DoctorLeadsNav.tsx`, `src/components/doctor/DoctorObservationForm.tsx`, `src/components/forms/SearchableAreaMultiSelect.tsx`, `src/components/forms/SearchableAreaSelect.tsx`, `src/components/landing/AreaCoverageSection.tsx`, `src/components/landing/DoctorApplicationForm.tsx`, `src/components/landing/FaqSection.tsx`, `src/components/landing/HeroSection.tsx`, `src/components/landing/LeadForm.tsx`, `src/components/landing/ServiceSection.tsx`, `src/components/landing/TrustSection.tsx`, `src/components/landing/constants.ts`, `src/lib/admin-leads-search.ts`, `src/lib/admin-routes.ts`, `src/lib/auth-guards.ts`, `src/lib/auth-token.ts`, `src/lib/doctor-lead-access.ts`, `src/lib/doctor-server-session.ts`, `src/lib/format.ts`, `src/lib/phone.ts`, `src/lib/prisma.ts`, `src/lib/utm-from-search.ts`, `src/lib/validators.ts`, `src/middleware.ts`.

Plus: `docs/QUARBANI_LEAD_DOCTOR_AREA_FLOW_PLAN_2026.md`, `prisma/schema.prisma`, `prisma/seed.ts`, migrations under `prisma/migrations/`.

---

**Document version:** 2026 — backend log, frontend log, final QA sign-off, known limitations, login flows, file inventory, and command results.
