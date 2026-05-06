# Admin & Doctor Settings — Implementation Plan

**Date:** 2026-05-06  
**Scope:** Planning only — no runtime behavior changes in this document.  
**Product:** Quarbani 2026 (public landing → leads; admin operations; doctor portal).

---

## 1. Current system findings

### 1.1 App structure

| Area | Notes |
|------|------|
| Public landing | `src/app/page.tsx` — server component; loads areas, doctor previews, showcase via `src/lib/landing-public-data.ts`; embeds `LeadForm`, hero/footer CTAs. |
| Admin UI | Pages under `src/app/admin/**` with shared `AdminNav` (`src/components/admin/AdminNav.tsx`). Routes include dashboard, requests (leads), doctors CRUD, doctor applications, reports, notifications. **No `/admin/settings` today.** |
| Doctor UI | Pages under `src/app/doctor/**`; `DoctorLeadsNav` (`src/components/doctor/DoctorLeadsNav.tsx`). `/doctor/apply` is **public** (middleware exempt). **No `/doctor/settings` today.** |
| Components | Landing under `src/components/landing/**`; admin forms under `src/components/admin/**`; shared forms under `src/components/forms/**`. |

### 1.2 Auth & session

- **Mechanism:** HMAC-signed cookie `qurbani_auth` (`src/lib/auth-token.ts`), verified in Edge `middleware.ts` and in Route Handlers via `getAuthFromCookies` (`src/lib/auth-guards.ts`).
- **Admin:** Roles `ADMIN` and `STAFF` may access `/admin` and `/api/admin/*`.
- **Doctor:** Role `DOCTOR` for `/doctor` (except `/doctor/login`, `/doctor/apply`) and `/api/doctor/*`.
- **Server pages:** Doctors use `getLoggedInDoctor()` (`src/lib/doctor-server-session.ts`) which reads cookies via `next/headers`.
- **Password:** bcrypt `passwordHash` on `User`; doctor login at `POST /api/doctor/login` (`src/app/api/doctor/login/route.ts`). Password change is **not** exposed in UI yet but is technically feasible (same pattern as `PATCH /api/admin/doctors/[id]`).

### 1.3 Data models (Prisma)

Relevant excerpts from `prisma/schema.prisma`:

- **`Area`:** `slug`, `name`, `nameBn`, **`sortOrder`**, **`isActive`** — already supports ordering and activation. Seeded in `prisma/seed.ts`; **no admin UI** dedicated to editing areas (only selection in doctor/application flows via `/api/areas`).
- **`User` (doctors):** `name`, `phone`, `email`, `whatsapp`, `passwordHash`, `isActive`, **`notes`** (used as landing “experience” blurb in `getDoctorPreviews`), **`emergencyAvailable`**, deprecated `areaCoverage`, **`doctorAreas`** (M:N with `Area`).
- **`Lead`:** Full intake + `priority` (`NORMAL` / `URGENT` / `EMERGENCY`), assignment, status workflow — **must remain unchanged in behavior** except where settings gates wrap existing endpoints (see §4).
- **`DoctorApplication`:** Full pipeline with `DoctorApplicationStatus`; `POST /api/doctor-applications` always accepts when validation passes.
- **`Notification`:** In-app queue (`NotificationChannel.IN_APP` today); admin page documents outbound drivers as future.

**There is no `SiteSetting` or global key-value store in the schema.**

### 1.4 Public contact & copy today

- Primary phone/WhatsApp for landing CTAs and thank-you page come from **`LANDING_SUPPORT_DIGITS`** in `src/components/landing/constants.ts` (hardcoded example string), wired through `src/components/landing/landing-contact.ts`.
- Root **`metadata`** (title, description, OG) is static in `src/app/layout.tsx` with optional `NEXT_PUBLIC_APP_URL`.

### 1.5 Lead & application APIs (integration points for settings)

- **`POST /api/leads`** (`src/app/api/leads/route.ts`): Requires `customerName`, `phone`, `areaId`, `serviceRequirement`; validates active area; supports `priority` including `EMERGENCY` (via body → `parsePublicLeadIntake`). Creates in-app notification. **No feature flags.**
- **`GET /api/areas`:** Returns **only `isActive: true`** areas.
- **`POST /api/doctor-applications`:** Requires name, phone, email, at least one active area; **no global enable/disable flag.**

### 1.6 Implementation style

- **No `"use server"` / Server Actions** found in `src/` — mutations use **Route Handlers** (`src/app/api/**/route.ts`) with JSON bodies and `fetch` from client components.
- Admin/doctor forms follow **client component + `fetch` to `/api/...`** pattern (`DoctorEditForm`, `LeadForm`, etc.).

---

## 2. Proposed database changes

### 2.1 Global settings: `SiteSetting` (key-value)

**Goal:** One simple table for website/system/SEO/contact/lead flags without touching lead/doctor core tables.

```prisma
model SiteSetting {
  key       String   @id
  value     String   @db.Text
  updatedAt DateTime @updatedAt
}
```

- **`key`:** Namespaced string, e.g. `contact.phone_call`, `leads.form_enabled`, `seo.meta_description`.
- **`value`:** Either plain string OR JSON-encoded object/array for grouped toggles (e.g. `notifications.channels` → `{"whatsapp":false,"sms":false,"email":true}`). Keep parsing centralized in one helper module.

**Migration:** Add table only; **no changes** to `Lead`, `LeadStatus`, assignment logic, or notification enum definitions in phase 1.

### 2.2 Doctor self-service fields (minimal extensions to `User`)

Today, doctor “profile” on the landing reuses **`notes`** as experience text; there is **no photo URL**, no structured qualification, no dedicated bio, no working-hours text on `User`.

**Recommended (still simple):** add nullable columns on `User` used only when `role === DOCTOR` (Prisma cannot enforce role-specific columns; enforce in application layer):

| Column | Purpose |
|--------|---------|
| `profilePhotoUrl` | Optional HTTPS URL (upload pipeline out of scope — URL field only until storage exists). |
| `qualification` | Short qualification line(s). |
| `experienceSummary` | Distinct from `notes` if you want admin vs public separation; **alternative:** keep using `notes` for landing and add only `qualification` + `bio` to avoid duplication — **decide in COMMAND 2/3:** either migrate landing to new fields or document mapping. |
| `bio` | Longer public-facing bio (`@db.Text`). |
| `availableTimeText` | Bengali-friendly free-text schedule (`@db.Text`). |
| `notifyEmail` / `notifySms` / `notifyWhatsApp` | Booleans default `false` until outbound exists — optional; can be deferred and stored as JSON in a single `notificationPrefs` text field instead. |

**Area preference “request”:** Avoid automatic `DoctorArea` changes without admin approval. Options:

- **A (preferred):** New table `DoctorAreaPreferenceRequest` — `userId`, `requestedAreaIds` (JSON array of ints), `status` (PENDING/APPROVED/REJECTED), `createdAt`, optional `adminNote`. Admin approves via existing `/api/admin/doctors/[id]/areas` pattern.
- **B (lighter):** Reuse `Notification` row with a new `NotificationType` — couples queue semantics; only choose if you want zero new tables.

**Password change:** No schema change; use existing `passwordHash` with bcrypt in a new `PATCH /api/doctor/me/password` (name TBD).

### 2.3 What not to change

- Do **not** alter `Lead` columns or status enums for settings.
- Do **not** replace `Area` with settings; use existing `isActive` / `sortOrder` and admin UI to mutate them.

---

## 3. Proposed routes, pages, and components

### 3.1 Admin (settings hub)

| Route | Purpose |
|-------|---------|
| `/admin/settings` | Overview cards + links to sub-pages (Bengali-friendly labels). |
| `/admin/settings/contact` | Phone, WhatsApp, emergency hotline, email, address, social/map links. |
| `/admin/settings/website` | Landing copy blocks (optional phased), maintenance/public flags, admin notice banner text. |
| `/admin/settings/leads` | Lead form on/off, emergency submissions on/off, custom success message (thank-you), optional required-field policy (see §4). |
| `/admin/settings/areas` | **Recommended addition:** list areas, toggle `isActive`, edit `sortOrder` (numeric), labels read-only or editable if product wants — aligns with “area settings” and existing schema. |
| `/admin/settings/doctors` | Deep-link or embedded reminders that heavy doctor edits stay on `/admin/doctors`; optional shortcuts only — avoids duplicating `DoctorEditForm`. |
| `/admin/settings/doctor-applications` | Toggle applications open/closed; optional default messaging when closed. |
| `/admin/settings/notifications` | Admin/doctor notification toggles; channel flags (WhatsApp/SMS/email) for future workers. |
| `/admin/settings/seo` | Page title override, meta description, Facebook Pixel ID, GA/GTM ID (stored as strings; injection via layout or client script component). |

**Navigation:** Add “সেটিংস” (or bilingual “Settings”) link to `AdminNav` pointing to `/admin/settings`.

### 3.2 Doctor

| Route | Purpose |
|-------|---------|
| `/doctor/settings` | Single page with sections (profile, contact, availability, emergency flag, area preference request, notification prefs, password). |

**Navigation:** Add “সেটিংস” link to `DoctorLeadsNav`.

### 3.3 Shared library modules (new)

| Module | Responsibility |
|--------|----------------|
| `src/lib/site-settings.ts` | Typed keys, `getSiteSettings()`, `getSiteSetting(key)`, defaults merge, JSON parse safety. |
| `src/lib/site-settings-keys.ts` (or merged) | Constants for all keys to avoid typos. |

Use **`unstable_cache`** or short TTL revalidation where appropriate so public pages do not hammer the DB; bust cache on admin save.

### 3.4 API shape (match existing style)

| Endpoint | Auth | Verb | Notes |
|----------|------|------|-------|
| `GET /api/admin/settings` | Admin | GET | Return merged settings (safe for UI; no secrets). |
| `PATCH /api/admin/settings` | Admin | PATCH | Partial update by key map; validate URLs/phones. |
| `GET /api/doctor/me` | Doctor | GET | Profile + areas + prefs. |
| `PATCH /api/doctor/me` | Doctor | PATCH | Allowed profile fields only; not `isActive` or `role`. |
| `PATCH /api/doctor/me/password` | Doctor | PATCH | Current password + new password. |
| `POST /api/doctor/me/area-preference` | Doctor | POST | Create pending request (if model A). |

**Alternative:** split admin API by section (`/api/admin/settings/contact`, etc.) — slightly more files, clearer boundaries.

Public read of contact/SEO for SSR:

- Either **server-only import** of `getSiteSettings()` inside `page.tsx` / layout, or a **public** `GET /api/public/site-config` (cached) if client hydration needs it — prefer server reads for SEO and security.

---

## 4. Admin settings list (functional requirements)

### 4.1 Website / landing

- Optional: hero tagline, trust bullets, footer disclaimer overrides (phased — many strings today live in components).
- **Maintenance mode:** when on, public routes show a friendly Bengali maintenance page; **admin/doctor portals remain reachable** for operations (or configurable).
- **Public site off:** stronger than maintenance — e.g. only static message (define behavior explicitly in implementation).
- **Admin notice:** optional banner text on admin layout for staff (e.g. “নোটিশ: আজ রাত ১২টার পর ডেটা মাইগ্রেশন”) — stored in `SiteSetting`.

### 4.2 Contact

- Phone (call), WhatsApp (digits normalized like existing `normalizeBangladeshPhone`), emergency hotline (can duplicate call number or separate), email, physical address.
- Facebook page URL, Messenger link, Google Maps URL / embed link.

### 4.3 Lead / request settings

- **Lead form enabled:** if off, hide or disable `LeadForm` submit and **`POST /api/leads`** returns `403` with Bengali message.
- **Emergency requests enabled:** if off, **`LeadForm`** hides EMERGENCY/`URGENT` options (or forces NORMAL) and **`POST /api/leads`** rejects non-`NORMAL` priority with `403`.
- **Success message:** customizable body text on `/thank-you` (keep reference `#leadId` behavior).
- **Required field control:** today server requires `customerName`, `phone`, `areaId`, `serviceRequirement`. Optional keys in settings could mark extra fields as required **only if** the same validation is implemented in `parsePublicLeadIntake` / `POST /api/leads` **and** mirrored in `LeadForm` — treat as **phase 2** to avoid subtle client/server drift.

### 4.4 Area settings

- Use **`Area`** table: toggle `isActive`, adjust `sortOrder`. Optionally edit `name` / `nameBn` / `slug` with care (slug renames break bookmarks — warn in UI).

### 4.5 Doctor management

- Remains on **`/admin/doctors`** and **`PATCH /api/admin/doctors/[id]`** (profile, areas, `isActive`, `emergencyAvailable`, password). Settings hub only links or duplicates toggles if explicitly needed later.

### 4.6 Doctor application settings

- **`applications_enabled`:** when false, `/doctor/apply` shows Bengali explanation; **`POST /api/doctor-applications`** returns `403`.
- **Review status** is per-row (`DoctorApplication.status`) — already on admin application detail; settings page can surface **workflow help text** only, not replace DB status.

### 4.7 Notification settings

- **Admin notify** / **Doctor notify** master toggles: interpreted when creating notifications (e.g. skip `prisma.notification.create` on new lead if admin toggle off — **define carefully** so ops still see leads in admin UI; may mean “skip outbound only” vs “skip in-app row”). Recommend: toggles named **`notify_admin_in_app`**, **`notify_doctor_in_app`** to avoid ambiguity.
- **Channel flags:** WhatsApp/SMS/email — persist for future cron/worker; no behavior change until drivers exist.

### 4.8 SEO / marketing

- Default title & meta description overrides (fallback to current `layout.tsx` defaults).
- Facebook Pixel ID, GA4 / GTM container ID — inject only when non-empty and valid format (alphanumeric/dash).

### 4.9 System

- Maintenance, public off, admin notice — covered in §4.1.

---

## 5. Doctor self-settings list

| Feature | Source / behavior |
|---------|-------------------|
| Profile photo | `User.profilePhotoUrl` (URL until upload exists). |
| Name | `User.name` — allow edit or **request-only** if admin must approve; default plan: **editable** with audit optional later. |
| Qualification, experience, bio | New columns or mapped from `notes` — see §2.2. |
| Phone / WhatsApp / email | Editable with validation; enforce uniqueness same as admin PATCH (BD phone rules). |
| Availability status | Could be `isActive` **read-only** for doctor (admin only) — instead expose **“available for new assignments”** as a separate bool later; **phase 1:** only `emergencyAvailable` toggle + `availableTimeText`. |
| Working time | `availableTimeText`. |
| Emergency availability | Existing `emergencyAvailable`. |
| Area preference | Submit **request** for admin approval (§2.2). |
| Password change | Current + new password, bcrypt. |
| Notification preference | Per-doctor booleans or JSON — future-proof for SMS/WhatsApp/email. |
| Treatment workflow | **Out of scope** — remains on lead detail pages / existing APIs. |

**Bengali UX:** All new labels, errors, and empty states should use clear **Bangla** copy (e.g. “সংরক্ষণ সম্পন্ন”, “অনুমতি নেই”, “সেটিংস আপডেট করা যায়নি”) with concise technical hints only where needed.

---

## 6. Implementation phases

### Phase A — Foundation

1. Prisma migration: `SiteSetting` + doctor columns / optional `DoctorAreaPreferenceRequest`.
2. Seed or migration SQL: insert sensible **defaults** (mirror current `LANDING_SUPPORT_DIGITS` and layout metadata so deploy is no-op visually).
3. `src/lib/site-settings.ts` with typed access + defaults + cache.

### Phase B — Admin settings UI + API

1. `GET`/`PATCH` admin settings API with validation.
2. Admin pages under `/admin/settings/*` + `AdminNav` link.
3. Area management page writing to `Area` model.

### Phase C — Public consumption

1. Replace hardcoded `LANDING_SUPPORT_DIGITS` usage with DB-backed values (fallback to constant if row missing).
2. Optional `generateMetadata` on home/thank-you **or** dedicated metadata helper reading settings.
3. Gates on `POST /api/leads` and `POST /api/doctor-applications`.
4. Maintenance / public-off checks in **server components or Node layout** — avoid Prisma in Edge `middleware` unless using a data layer compatible with Edge; document chosen approach.

### Phase D — Doctor self-settings

1. `/doctor/settings` page + `PATCH /api/doctor/me` (+ password route).
2. Area preference request flow + minimal admin list to approve (could be phase E).

### Phase E — SEO scripts & polish

1. Conditional Pixel/GA snippets (privacy-conscious placement).
2. Notification worker hooks reading channel flags (stub).

---

## 7. Risk notes

| Risk | Mitigation |
|------|------------|
| **Edge middleware vs DB** | Maintenance/public-off using Prisma inside `middleware.ts` may be unsupported or slow. Prefer checking flags in **server layouts/pages** or caching in memory with ISR. |
| **Lead form / API drift** | Any “required field” config must be validated **both** in `LeadForm` and `POST /api/leads`. |
| **Caching stale settings** | After admin save, revalidate paths (`revalidatePath`) or clear `unstable_cache` tags. |
| **Doctor edits vs admin authority** | Doctors must not change `isActive`, `role`, or assigned areas directly — only requests. |
| **Uniqueness collisions** | Phone/email updates must reuse the same duplicate checks as admin doctor PATCH. |
| **Bengali copy regression** | Review all new user-facing strings for clarity and tone. |

---

## 8. Verification checklist

- [ ] Migration applies cleanly on empty DB and existing production-like DB.
- [ ] Default settings reproduce current landing phone/WhatsApp behavior (or intentional improvement documented).
- [ ] With **lead form disabled**, public UI and `POST /api/leads` both block submissions with Bengali messaging.
- [ ] With **emergency disabled**, emergency priority cannot be submitted via API tampering.
- [ ] With **applications disabled**, apply page and `POST /api/doctor-applications` block.
- [ ] **Admin and doctor login** still work; middleware unchanged except any new explicit exemptions if added (avoid touching auth cookie logic unnecessarily).
- [ ] **Lead workflow** (assign, accept, status transitions, case report) unchanged when settings are default.
- [ ] Area list on landing and `/api/areas` reflects `isActive` and `sortOrder` after admin edits.
- [ ] Doctor settings: password change logs out or keeps session per chosen UX; invalid current password rejected.
- [ ] SEO: view-source on `/` shows expected title/description when overrides set.
- [ ] **No regression** on `/thank-you?leadId=` reference display.

---

## 9. COMMAND 2/3 handoff

- **COMMAND 2 (suggested):** Implement Phase A + Phase B skeleton (schema, migration, `site-settings` lib, admin settings API, `/admin/settings` hub + contact + leads gates backend-only), with Bengali strings for new errors.
- **COMMAND 3 (suggested):** Public landing wiring, doctor `/doctor/settings`, maintenance mode behavior, SEO injection, and area admin UI polish + verification against §8.

---

*End of plan — implementation deliberately deferred.*
