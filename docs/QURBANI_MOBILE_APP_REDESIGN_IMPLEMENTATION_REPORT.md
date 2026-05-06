# Qurbani 2026 — Mobile App Redesign Implementation Report

Date: 2026-05-06  
Scope: Premium mobile-first shell, shared UI primitives, public/doctor/admin UX alignment, privacy and ordering fixes per `docs/QURBANI_MOBILE_APP_REDESIGN_MASTER_PLAN.md`.

## Summary

- Introduced a shared design token layer in `globals.css`, Bengali-first font (`Noto Sans Bengali`), and reusable UI primitives under `src/components/ui/`.
- Public customer flows (`/`, `/request`, `/thank-you`, `/doctors`, `/doctors/[id]`, `/track`) use a centered app shell, green gradient headers, gold primary CTAs where appropriate, and sticky bottom navigation on small screens.
- Doctor lead visibility now includes **peer-assigned leads in shared areas** as list/detail previews; **PII remains server-stripped** until the viewer is the assigned doctor. Dashboard/API stats use **actionable-only** scope so counts are not inflated by peer previews.
- Default lead ordering is **newest first** (`createdAt DESC`) for doctor API lists and admin requests list.
- Admin: mobile bottom navigation (subset + “আরও”), `/admin/areas` management UI, `/admin/more` hub, expanded **doctor create** API/form fields (profile, availability, photo URL).
- Admin reports mobile cards include a **lightweight CSS bar summary** (no new chart library).

## Changed / Added Files (high level)

### Design system and layout

- `src/app/globals.css` — tokens, light-only scheme, safe-area helpers, canvas background.
- `src/app/layout.tsx` — `Noto_Sans_Bengali`, single `themeColor`, removed Geist as primary sans.
- `src/lib/customer-nav.ts` — shared bottom nav items for public shell.

### UI primitives (`src/components/ui/`)

- `AppShell.tsx`, `AppHeader.tsx`, `BottomNav.tsx` (supports `tel:` / `https:` items).
- `AppCard.tsx`, `AppButton.tsx`, `AppBadge.tsx`, `AppSection.tsx`.
- `AppEmptyState.tsx`, `AppErrorState.tsx`, `AppSuccessState.tsx`, `AppLockedState.tsx`.
- `AppStatCard.tsx`, `AppField.tsx`, `AppInput.tsx`, `AppTextarea.tsx`, `AppSelect.tsx`, `AppSearchInput.tsx`.
- `AppDoctorCard.tsx`, `AppLeadCard.tsx`.

### Public routes

- `src/app/page.tsx` — `AppShell` + gradient header + service card grid + bottom nav; removed duplicate sticky CTA.
- `src/app/request/page.tsx` — same shell pattern.
- `src/app/thank-you/page.tsx` — success UI + optional lead snapshot + link to `/track`.
- `src/app/doctors/page.tsx`, `src/app/doctors/[id]/page.tsx` — public directory and safe detail (no phone/WhatsApp).
- `src/app/track/page.tsx` — minimal read-only tracking by `leadId` (safe fields only).

### Landing / data

- `src/components/landing/HeroSection.tsx` — gold “চিকিৎসার অনুরোধ করুন” + green “ডাক্তার দেখুন” CTAs above call/WhatsApp row.
- `src/lib/landing-public-data.ts` — `getPublicDoctorDirectory`, `getPublicDoctorById`, extended `DoctorPreview` type.
- `src/lib/lead-labels-bn.ts` — Bengali lead status labels for UI.

### Doctor / privacy / ordering

- `src/lib/doctor-lead-access.ts` — peer visibility branch, `createdAt` ordering, `active` tab, `buildDoctorActionableLeadWhere`, `doctorLeadActionableVisibilityWhereFromAreaIds`.
- `src/lib/lead-privacy.ts` — `isPeerLocked` + gated `canClaimPool` / `canAcceptAssigned` in list rows.
- `src/app/doctor/page.tsx`, `src/app/api/doctor/my-stats/route.ts` — actionable-only counts/lists.
- `src/app/doctor/leads/[id]/page.tsx` — copy update for locked-by-peer banner.
- `src/components/doctor/DoctorLeadsFilters.tsx` — tab labels + `active` tab.

### Admin

- `src/app/admin/layout.tsx` — bottom safe padding on small screens for sticky nav.
- `src/components/admin/AdminNavBar.tsx` — `/admin/areas`, bottom nav, “more” active path grouping.
- `src/app/admin/more/page.tsx` — hub for applications, areas, notifications, settings.
- `src/app/admin/areas/page.tsx`, `src/components/admin/AreaAdminRow.tsx` — area list + toggle / `nameBn`.
- `src/app/api/admin/areas/[id]/route.ts` — `PATCH` for `isActive`, `sortOrder`, `nameBn`.
- `src/app/admin/requests/page.tsx` — `orderBy: createdAt desc`.
- `src/app/api/admin/doctors/route.ts` — optional profile fields on create.
- `src/components/admin/DoctorForm.tsx` — matching create form fields.
- `src/app/admin/reports/page.tsx` — actionable visibility for counts + `MiniPerfBars` on mobile cards.

## Implemented Pages

| Route | Notes |
|-------|--------|
| `/` | Mobile shell, hero CTAs, 4 service cards, bottom nav |
| `/request` | Shell + gradient header |
| `/thank-you` | Success + optional lead summary + track link |
| `/doctors` | Search + area filter, safe cards |
| `/doctors/[id]` | Safe public profile |
| `/track` | Read-only status by `leadId` |
| `/admin/more` | Secondary admin links |
| `/admin/areas` | Area stats + PATCH controls |

## Backend / API Changes

- `GET` doctor leads: broader `where` (includes peer leads in areas); order **newest first**; list rows include `isPeerLocked`.
- `GET` doctor lead `[id]`: unchanged enforcement pattern — `doctorCanAccessLead` true for peers; `sanitizeDoctorLeadDetailJson` + `contactVisible` still gate PII.
- `POST` doctor accept: unchanged transaction / conflict handling; peers still get 409 when attempting accept.
- `PATCH /api/admin/areas/[id]`: partial updates for admin area management.
- `POST /api/admin/doctors`: accepts optional `qualification`, `experienceSummary`, `shortBio`, `profilePhotoUrl`, `availableTimeText`, `availabilityStatus`.

## Privacy Rules Confirmed

- Public doctor directory and detail loaders **never select** `phone`, `whatsapp`, `email`, or `passwordHash`.
- Doctor list API rows omit sensitive scalars; `buildDoctorLeadListRow` never includes phone/WhatsApp/address.
- Doctor detail: contact and `message` / address only when `canDoctorViewLeadCustomerContact` is true (assigned doctor).
- Peer-assigned leads: UI shows locked banner; server-rendered detail omits phone/address when `contactVisible` is false.
- Admin retains full access on admin routes and Prisma selects.

## Remaining Limitations

- **Media uploads**: still URL-list / placeholder only; no binary upload pipeline (per existing master plan note).
- **Ratings**: public doctor cards use **derived** “experience” labels from completed-case counts, not independent star ratings.
- **Admin-wide visual reskin**: many admin pages still use legacy card/table classes; shell + bottom nav + key pages (home, request, thank-you, areas, reports mobile) are upgraded first.
- **Doctor portal shell**: doctor pages do not yet all use `AppShell`; nav remains `DoctorLeadsNav`-centric on several routes.
- **Middleware → proxy**: Next.js 16 deprecation warning unchanged (deferred per master plan).
- **Database / migration drift**: not reset in this work; if `prisma migrate` reports environment-specific drift, resolve outside this redesign.

## Commands Run

```bash
npx prisma generate
npx prisma validate
npm run lint
npm run typecheck
npm run build
```

All completed successfully in this environment (Windows PowerShell).

## Manual Test Checklist

1. **Public**: `/` loads; bottom nav: home, doctors, request, call; hero gold/green CTAs work; no doctor phones on `/` preview or `/doctors`.
2. **Request**: submit lead; `/thank-you?leadId=` shows id, time, area, status; link to `/track?leadId=` matches.
3. **Doctors**: filter by name and area; open `/doctors/[id]` — still no phone/WhatsApp.
4. **Doctor login** and **dashboard** counts: pool + mine only (not inflated by peer rows).
5. **Doctor leads**: newest first; see peer lead in shared area as locked; open detail — no contact; message matches locked copy; accept pool lead still atomic.
6. **Admin requests**: list order newest first.
7. **Admin areas**: toggle active; save `nameBn`; confirm public `/api/areas` reflects `isActive` filtering.
8. **Admin bottom nav** (mobile width): primary tabs + “আরও” opens hub; areas reachable.
9. **Create doctor** with new optional fields; doctor can log in with email/password as before.
10. **Reports** (mobile): mini bars render; desktop table unchanged in spirit.
