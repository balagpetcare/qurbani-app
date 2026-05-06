# Qurbani 2026 — Next Stage Master Implementation Plan

**Document:** `docs/Q26_NEXT_STAGE_MASTER_PLAN.md`  
**Command:** Q26-CMD-01  
**Scope:** Quarbani / Qurbani 2026 veterinary support app only — **must remain separate from BPA/WPA** (no shared auth, DB, or deployment coupling).  
**Status:** Planning only — no business-logic changes were made to produce this document.

---

## 1. Current system summary

### 1.1 Product flow (as implemented)

1. **Public landing** (`/`) — Hero, services, trust, **lead form** (`LeadForm`), area coverage, FAQ; footer links to doctor application.
2. **Lead creation** — `POST /api/leads` validates Bangladesh phone/WhatsApp, requires `areaId` (active `Area` from DB), optional animal fields, UTM/landing metadata; creates `Notification` (in-app) for new lead; duplicate hint within 24h via phone variants.
3. **Thank-you** — `/thank-you` after submission (client navigation from form).
4. **Admin** — Cookie-based JWT (`AUTH_COOKIE_NAME` in `src/lib/auth-token.ts`); `middleware.ts` protects `/admin/*` and `/api/admin/*` for role `ADMIN` only.
5. **Admin requests / leads** — List lives at **`/admin/requests`** (canonical path in `src/lib/admin-routes.ts`); API `GET /api/admin/leads` with filters (`src/lib/admin-leads-search.ts`), **newest first** (`orderBy: { createdAt: "desc" }`). Detail: `/admin/leads/[id]` with notes, status, assign doctor.
6. **Doctors** — `middleware.ts` protects `/doctor/*` (except `/doctor/login`, `/doctor/apply`) and `/api/doctor/*` for role `DOCTOR`.
7. **Doctor visibility** — **`buildDoctorLeadWhere`** (`src/lib/doctor-lead-access.ts`): a doctor sees leads **assigned to them OR whose `areaId` is in `DoctorArea`** for that user. Same visibility logic is mirrored in admin reports (`src/app/admin/reports/page.tsx`).
8. **Doctor workflow** — List/detail under `/doctor/leads`, observations API, status updates; dashboard at `/doctor` with counts scoped to visible leads.
9. **Doctor applications** — Public `POST /api/doctor-applications` with multi-area selection; admin list/detail and **convert to `User` + `DoctorArea`** via admin APIs.

### 1.2 Tech stack

- **Framework:** Next.js **16.2.4** (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Data:** PostgreSQL, Prisma **7.8** with client output at `src/generated/prisma`; `@prisma/adapter-pg` + `pg`.
- **Auth:** bcrypt password hashes on `User`; JWT in HTTP-only cookie; separate admin and doctor login API routes.

### 1.3 Notable schema capabilities already present

- **`Area`** — Seeded list; `DoctorArea` and `Lead.areaId` tie coverage to leads.
- **`User.emergencyAvailable`** — Boolean on user (doctor); not yet wired to lead triage in UI/API observed in this pass.
- **`LeadAssignment`** — History table exists alongside `Lead.assignedDoctorId`.
- **`Notification`** — Queued in-app rows; WhatsApp/SMS/EMAIL enum values exist; delivery integration depth not verified in this plan.

---

## 2. Existing files / modules inventory

### 2.1 Database & migrations

| Location | Role |
|----------|------|
| `prisma/schema.prisma` | Single source of truth for models/enums |
| `prisma/seed.ts` | Main admin + `Area` upserts (`ADMIN_SEED_*` env) |
| `prisma/migrations/*.sql` | Incremental history (init, notes, doctor fields, UTM, duplicates, notifications, areas workflow, passwords, etc.) |
| `prisma.config.ts` | Prisma config (present in repo) |

### 2.2 Core libraries

| File | Purpose |
|------|---------|
| `src/lib/prisma.ts` | Prisma client singleton |
| `src/lib/auth-token.ts` | JWT create/verify, cookie name |
| `src/lib/auth-guards.ts` | `requireAdminFromRequest`, `requireDoctorFromRequest` |
| `src/lib/doctor-server-session.ts` | Server-side doctor session helper |
| `src/lib/doctor-lead-access.ts` | Area + assignment visibility rules |
| `src/lib/admin-leads-search.ts` | Admin lead list query parsing / `where` builder |
| `src/lib/admin-routes.ts` | `ADMIN_REQUESTS_PATH`, lead detail path helper |
| `src/lib/phone.ts` | Bangladesh normalization + display |
| `src/lib/validators.ts` | Trim, ID parsing helpers |
| `src/lib/format.ts` | Date/time display |
| `src/lib/utm-from-search.ts` | UTM helpers (landing) |

### 2.3 Middleware

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Protects admin and doctor routes/APIs; allows login/logout and `/doctor/apply` |

### 2.4 Public app routes

| Path | Notes |
|------|-------|
| `src/app/page.tsx` | Landing composition |
| `src/app/thank-you/page.tsx` | Post-lead |
| `src/app/doctor/apply/page.tsx` | Doctor applicant page |

### 2.5 Public / unauthenticated APIs

| Route | Role |
|-------|------|
| `src/app/api/leads/route.ts` | Create lead |
| `src/app/api/areas/route.ts` | Active areas for selects |
| `src/app/api/doctor-applications/route.ts` | Create application |

### 2.6 Admin UI

| Path | Role |
|------|------|
| `src/app/admin/page.tsx` | Dashboard stats + recent leads |
| `src/app/admin/requests/page.tsx` | Lead list (requests) |
| `src/app/admin/leads/[id]/page.tsx` | Lead detail |
| `src/app/admin/doctors/*` | CRUD / new / edit |
| `src/app/admin/doctor-applications/*` | Application queue |
| `src/app/admin/reports/page.tsx` | Doctor performance table |
| `src/app/admin/notifications/page.tsx` | Notifications UI |
| `src/app/admin/login/*` | Admin login |

### 2.7 Admin APIs (representative)

- `src/app/api/admin/login/route.ts`, `logout/route.ts`
- `src/app/api/admin/leads/route.ts`, `leads/[id]/route.ts`, `status/route.ts`, `notes/route.ts`, `assign-doctor/route.ts`
- `src/app/api/admin/doctors/route.ts`, `doctors/[id]/route.ts`, `doctors/[id]/areas/route.ts`, `doctors/performance/route.ts`
- `src/app/api/admin/doctor-applications/route.ts`, `[id]/route.ts`, `[id]/convert/route.ts`

### 2.8 Doctor UI

| Path | Role |
|------|------|
| `src/app/doctor/page.tsx` | Doctor dashboard |
| `src/app/doctor/leads/page.tsx`, `[id]/page.tsx` | Lead list/detail |
| `src/app/doctor/login/*` | Login |

### 2.9 Doctor APIs

- `src/app/api/doctor/login/route.ts`, `logout/route.ts`
- `src/app/api/doctor/leads/route.ts`, `leads/[id]/route.ts`, `leads/[id]/status/route.ts`, `leads/[id]/observations/route.ts`
- `src/app/api/doctor/my-stats/route.ts`

### 2.10 Landing / shared components (selected)

- `src/components/landing/*` — `HeroSection`, `LeadForm`, `AreaCoverageSection`, `DoctorApplicationForm`, etc.
- `src/components/forms/SearchableAreaSelect.tsx`, `SearchableAreaMultiSelect.tsx`
- `src/components/admin/*` — Nav, filters, doctor forms, lead status, assign doctor, etc.
- `src/components/doctor/*` — Lead nav, observation form, status editors

### 2.11 Layout

- `src/app/layout.tsx` — Root layout, metadata, fonts (`lang="bn"`)

---

## 3. Gap analysis (current → requested next stage)

| # | Feature | Current state | Gap |
|---|---------|---------------|-----|
| 1 | Pre-Qurbani cattle buying checklist | No dedicated content model or page section | Content structure, optional CMS-like or static section, maybe printable/PDF later |
| 2 | Common animal problem **categories** | Free-text `animalType`, `serviceRequirement`, observations `condition` | Taxonomy table(s), lead linkage, admin maintenance, filters |
| 3 | Area-based visibility & doctor coverage | **Implemented** via `Area`, `DoctorArea`, `buildDoctorLeadWhere` | Possible enhancements: stricter “only assigned” mode, staff role routing, map/geo later |
| 4 | Lead priority (emergency / urgent / normal) | No `Lead` priority field | Enum + UI (customer + admin override) + sort/filter + notifications |
| 5 | Photo/video on leads | No attachments model or storage | Storage (S3/R2/local), upload API, virus/size limits, privacy consent |
| 6 | Doctor profile **display** (public) | Doctor data on `User` + admin edit only | Public slug page or directory, opt-in visibility, PII boundaries |
| 7 | Completed case showcase | No showcase model | Curated cases, consent, anonymization, landing section |
| 8 | Doctor video advice library | No media library | Metadata model, hosting, landing/doctor portal playback, admin CRUD |
| 9 | Doctor application **workflow** | Create application + admin review + convert exists | Richer states, email/WhatsApp notifications, applicant status page, anti-spam |
| 10 | Doctor case **completion report** | `LeadStatus.COMPLETED` + observations/notes | Structured report fields, PDF/export, customer-facing summary optional |
| 11 | Admin dashboard **statistics** | Counts on `/admin` + `/admin/reports` | Time series, funnel, priority breakdown, SLA, export |
| 12 | Mobile / Android-ready + bottom CTA | Responsive patterns exist (e.g. admin tables ↔ cards) | Sticky bottom CTA on landing, touch targets, PWA/TWA optional later |

**Authorization note:** `UserRole.STAFF` exists in Prisma but **middleware only allows `ADMIN`** for `/admin` and `/api/admin`. Any “authorized users” beyond admin for lead visibility needs an explicit design (e.g. STAFF policies or separate guard).

---

## 4. Proposed database / schema changes

*(High level — exact naming to be finalized in Q26-CMD-02+ migrations.)*

### 4.1 Enums

- **`LeadPriority`:** `NORMAL`, `URGENT`, `EMERGENCY` (or `LOW`/`MEDIUM`/`HIGH` — align with Bangla UX copy).
- **`LeadAttachmentKind`:** `IMAGE`, `VIDEO` (optional `DOCUMENT` later).
- **`ShowcaseConsentStatus`:** for anonymized public display.

### 4.2 Taxonomy

- **`AnimalProblemCategory`** (or `LeadProblemCategory`): `id`, `slug`, `name`, `nameBn`, `sortOrder`, `isActive`, optional `parentId` for hierarchy.
- **`LeadProblemCategory`** join (many-to-many) or single `primaryCategoryId` + optional `secondary` JSON — prefer FK + join for reporting.

### 4.3 Lead extensions

- `Lead.priority` → `LeadPriority` (default `NORMAL`).
- `Lead.checklistAcknowledgedAt` / JSON `checklistResponses` — if checklist is persisted per lead; otherwise checklist is informational only on landing.
- **Attachments:** `LeadAttachment` with `leadId`, `storageKey`, `publicUrl` (or CDN path), `mimeType`, `sizeBytes`, `kind`, `createdAt`, optional `uploadedBy` / source enum (customer vs doctor).

### 4.4 Doctor public profile

- Option A (minimal): `User` fields `publicProfile`, `profileSlug`, `bio`, `photoUrl`, `showOnWebsite`.
- Option B (cleaner): `DoctorProfile` 1:1 with `User` where `role = DOCTOR`.

### 4.5 Content modules

- **`AdviceVideo`:** `title`, `titleBn`, `description`, `videoUrl` or `storageKey`, `thumbnailUrl`, `doctorId` optional, `areaId` optional, `sortOrder`, `isPublished`, `publishedAt`.
- **`CaseShowcase`:** `title`, `summary`, `imageUrl`, `leadId` optional (internal link), anonymized fields, `isPublished`, `doctorId` optional, `tags`.

### 4.6 Completion report

- **`LeadCompletionReport`:** 1:1 with `Lead` when completed: structured fields (diagnosis summary, treatment, follow-up, medications reference text), `submittedByUserId`, `submittedAt`, optional `customerVisibleSummary`.

### 4.7 Doctor application workflow

- Extend `DoctorApplicationStatus` or add sub-status / `rejectionReason`, `applicantNotifiedAt`.
- Optional: `DoctorApplicationNote` (internal admin thread) vs reusing generic admin notes table.

### 4.8 Indexes / performance

- Composite indexes on `Lead (priority, createdAt)`, `Lead (areaId, status)`, `LeadAttachment (leadId)`.
- Full-text search optional later (Postgres `tsvector`) for messages and reports.

---

## 5. Proposed frontend pages / components

### 5.1 Public landing (`/`)

- **Pre-Qurbani checklist section** — collapsible checklist, print-friendly styles; component e.g. `PreQurbaniChecklistSection`.
- **Problem category** — integrate into `LeadForm` (searchable select from `/api/...` categories).
- **Priority** — self-service selector with guardrails (copy: emergency misuse disclaimer); admin can override.
- **Media upload** — progressive enhancement: file input + progress; mobile camera capture.
- **Doctor directory / profiles** — link from trust section; ` /doctors` list + `/doctors/[slug]`.
- **Showcase** — `CompletedCaseShowcaseSection` (curated API or static build).
- **Video library** — `AdviceVideoSection` + dedicated `/advice` or `/videos` if SEO matters.
- **Sticky bottom CTA** — “কল করুন / লিড দিন” bar, safe-area padding for iOS/Android browsers.

### 5.2 New public routes (examples)

- `/doctors` — published profiles only.
- `/doctors/[slug]` — profile + areas + optional videos filter.
- `/cases` or anchor on `/` — showcase listing.
- `/advice` — video library with filters (problem category, area).

### 5.3 Customer lead flow

- Update `LeadForm` + `POST /api/leads` contract for: `priority`, `categoryIds` or `primaryCategoryId`, `attachmentIds` or multipart upload flow.

---

## 6. Proposed admin panel changes

- **Leads / requests:** columns and filters for **priority**, **categories**, **has media**; bulk actions (assign by area) optional.
- **Lead detail:** media gallery, priority editor, category editor, duplicate of current notes/status.
- **Content:** CRUD for `AdviceVideo`, `CaseShowcase`, `AnimalProblemCategory` (new nav items in `AdminNav`).
- **Doctor profiles:** toggle “publish profile”, edit slug/bio/photo, link to public preview.
- **Completion reports:** form for structured report when marking completed (or gate `COMPLETED` on report submission — product decision).
- **Dashboard:** charts (leads per day, completion time, priority mix), doctor leaderboard refinements, export CSV.
- **Applications:** workflow UI for notify applicant, reject with reason, duplicate detection.

---

## 7. Proposed doctor panel changes

- Lead list/detail: show **priority**, **categories**, **media**; sort defaults (emergency first).
- **Completion report** form on completion path (integrate with `LeadCompletionReport`).
- **My profile** (optional): allow doctors to propose edits pending admin approval, or view-only public preview.

---

## 8. Proposed API / middleware / storage (cross-cutting)

- **Upload service:** new `POST /api/uploads` or signed URL flow; never trust client MIME; scan/limit; store outside web root with signed access if private.
- **Public read APIs:** `GET /api/public/doctors`, `GET /api/public/videos`, `GET /api/public/cases` (rate-limited).
- **Auth:** if `STAFF` should access subset of admin APIs, extend `middleware.ts` + `auth-guards` consistently.
- **Privacy:** terms/consent strings for media and public showcase; retention policy.

---

## 9. Implementation sequence (from **Q26-CMD-02** onward)

Suggested order balances **user value**, **schema stability**, and **low regret**:

| Phase | Command anchor | Deliverable |
|-------|----------------|-------------|
| **Q26-CMD-02** | Schema & migrations foundation | `LeadPriority`, categories tables, `Lead` FKs, indexes; backfill defaults |
| **Q26-CMD-03** | Admin + API for taxonomy | Category CRUD, admin lead filters |
| **Q26-CMD-04** | Lead form + public API | Categories + priority in `LeadForm` + `POST /api/leads` |
| **Q26-CMD-05** | Doctor/admin UI for new fields | Sorting, badges, doctor list/detail |
| **Q26-CMD-06** | Media uploads | Storage binding, `LeadAttachment`, galleries, limits |
| **Q26-CMD-07** | Completion report | `LeadCompletionReport`, doctor submit, admin view/export |
| **Q26-CMD-08** | Public doctor profiles | Slug, directory pages, admin publish toggle |
| **Q26-CMD-09** | Video library | `AdviceVideo` + landing section + `/advice` |
| **Q26-CMD-10** | Case showcase | Curated cases + consent workflow |
| **Q26-CMD-11** | Pre-Qurbani checklist | Landing section (+ optional persistence on lead) |
| **Q26-CMD-12** | Doctor application workflow polish | Notifications, applicant-facing status, spam controls |
| **Q26-CMD-13** | Admin analytics | Dashboard charts + exports |
| **Q26-CMD-14** | Mobile CTA + responsive QA | Sticky CTA, bottom nav considerations, Lighthouse touch |

*(Command IDs Q26-CMD-02+ are placeholders until the project’s command ledger assigns them; keep this sequence as the default dependency order.)*

---

## 10. Risk notes

- **Clinical / legal:** Public copy must not imply remote diagnosis; emergency flows should direct to physical/vet intervention; media may contain sensitive data — **access control** and retention are critical.
- **Misuse of “Emergency” priority:** May require admin moderation, rate limits, or callback verification.
- **Storage cost & abuse:** Video/image uploads need caps, authenticated upload strategy, and background processing if transcoding is added later.
- **PII on public doctor profiles:** Balance marketing with harassment risk; prefer admin-approved publish.
- **Showcase anonymization:** Avoid leaking phone, exact address, or identifiable media without explicit consent.
- **Next.js / Prisma versions:** Follow `AGENTS.md` — verify against `node_modules/next/dist/docs/` when using new APIs (this repo is on Next 16 / Prisma 7).
- **Scope isolation:** No shared infrastructure with BPA/WPA — duplicate patterns if needed rather than importing their modules.

---

## 11. Testing checklist

### 11.1 Automated (to introduce or extend)

- Unit: phone normalization, `buildDoctorLeadWhere`, admin search query builder, priority sort helpers.
- Integration: `POST /api/leads` with categories/priority/attachments; doctor access denied for out-of-area unassigned lead.
- E2E (optional): submit lead → admin assigns → doctor completes → report visible.

### 11.2 Manual QA

- **Landing:** mobile Safari/Chrome — sticky CTA not covering inputs; file pickers work.
- **Admin:** filters combine correctly (status + area + priority + category); pagination preserves query string (`adminLeadsQueryString`).
- **Doctor:** list order respects priority; can open only allowed leads; media displays.
- **Public profiles:** unpublished doctors 404; slug uniqueness; Bangla/English mixed strings render.
- **Uploads:** large file rejection, invalid type rejection, broken image handling.
- **Applications:** invalid `areaIds` rejected; convert flow creates `DoctorArea` rows as today.
- **Regression:** existing migrations apply on clean DB; seed still runs with `ADMIN_SEED_PASSWORD`.

---

## 12. Summary

The codebase already delivers **area-seeded coverage**, **doctor–area lead visibility**, **admin lead operations**, and a **doctor application pipeline with conversion**. The next stage layers **taxonomy**, **triage priority**, **rich media**, **structured completion reporting**, **public marketing surfaces** (profiles, videos, cases), **checklist content**, **deeper analytics**, and **mobile-first CTA** — all while keeping the **Quarbani app a standalone product** from BPA/WPA.

---

*End of Q26-CMD-01 master plan.*
