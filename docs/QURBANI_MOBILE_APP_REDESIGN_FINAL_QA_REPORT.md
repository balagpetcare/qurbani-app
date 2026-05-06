# Qurbani mobile app redesign — final QA report

**Date:** 2026-05-06  
**Scope:** Command 2 follow-up — doctor portal polish, admin shell + pages, shared primitives, tooling.

## Duplicate `/admin/areas` route conflict (fix)

- **Issue:** Next.js App Router does not put route groups in the URL, so both `src/app/admin/areas/page.tsx` and `src/app/admin/(shell)/areas/page.tsx` resolved to **`/admin/areas`** and triggered a duplicate-route build error.
- **Resolution:** Canonical page kept at **`src/app/admin/(shell)/areas/page.tsx`**. The duplicate **`src/app/admin/areas/page.tsx`** was removed (content was identical to the shell copy; no merge needed).
- **Also removed:** Other stray `page.tsx` files that still lived under `src/app/admin/*` beside **`(shell)`** and **`login`** (e.g. `/admin`, `/admin/requests`, …) for the same reason—they duplicated URLs already defined under **`(shell)`**. **`/admin/login`** stays outside **`(shell)`** so it is not double-wrapped by the portal layout.
- **Unchanged:** `src/app/api/admin/areas/[id]/route.ts` and all other API routes; shared components such as `AreaAdminRow`.
- **Navigation:** `AdminNavBar` and **`/admin/more`** still link to **`/admin/areas`** (unchanged paths).
- **Build after fix:** `npx prisma generate` ✓, `npx prisma validate` ✓, `npm run lint` ✓, `npm run typecheck` ✓, `npm run build` ✓ (Next.js 16.2.4).

## Remaining screens migrated (this pass)

### Doctor

- **`/doctor/settings`** — Wrapped in `DoctorLeadsNav` (gradient `AppHeader`, shell, bottom nav on mobile). `DoctorSettingsForm` sections use `AppCard` instead of raw bordered sections.
- **`/doctor/apply`** — `AppShell` + gradient `AppHeader` + `AppCard` for “existing account” CTA; closed-state messaging uses `AppCard`.
- **`/doctor/login`** — `DoctorLoginClient` uses `AppShell`, gradient `AppHeader` (back to home), `AppCard` form, touch-sized fields and primary button.
- **Components:** `DoctorLeadsFilters` (`AppCard` flat + pill tabs), `DoctorLeadQuickStatus` (touch tokens), `DoctorLeadWorkflowPanel` (step-based `AppCard` groups + `rounded-2xl` controls), `DoctorObservationForm`, `LeadStatusTimeline` (emerald rail + primary dots).
- **Removed** — `DoctorNavBar.tsx` (superseded by `DoctorPortalChrome` / `DoctorLeadsNav`); no code imports remained.

### Admin

- **`src/app/admin/(shell)/layout.tsx`** — Centered canvas + phone shell + **`BottomNav`** after page content. **`src/app/admin/layout.tsx`** is a passthrough so **`/admin/login`** is not wrapped (avoids double `AppShell` with `AdminLoginClient`).
- **`AdminNavBar`** — Replaced flat white bar with **`AppHeader` `variant="gradient"`**; desktop links styled for dark header; drawer unchanged (white panel).
- **All logged-in admin routes** — Outer `min-h-screen bg-zinc-50` wrappers replaced with `min-w-0` (shell provides background). **`main`** regions use consistent horizontal padding and **`pb-app-nav lg:pb-8`** for clearance above bottom navigation on small screens.
- **`/admin` (dashboard)** — Summary tiles use **`AppStatCard`**; recent leads mobile list uses **`AppCard`**; sections use **`AppSection`**.
- **`/admin/login`** — `AdminLoginClient` aligned to **`AppShell` + `AppHeader` + `AppCard`** (Bengali labels, same touch/rounded language).

### Previously completed (foundation — unchanged)

Doctor dashboard, leads list, lead detail shell; public flows; APIs for privacy / sort / peer lock; areas, reports, etc. per earlier implementation.

---

## Pages checked (manual / structural)

| Area | Route / surface | Notes |
|------|------------------|--------|
| Customer | `/`, `/doctors`, `/doctors/[id]`, `/request`, `/thank-you`, `/track` | Not altered this pass; assumed OK from prior work. |
| Doctor | `/doctor`, `/doctor/leads`, `/doctor/leads/[id]`, `/doctor/settings`, `/doctor/apply`, `/doctor/login` | Shell + cards + workflow steps verified in code. |
| Admin | `/admin`, `/admin/requests`, `/admin/leads/[id]`, `/admin/doctors`, `/admin/doctors/new`, `/admin/doctors/[id]/edit`, `/admin/doctor-applications`, `/admin/doctor-applications/[id]`, `/admin/reports`, `/admin/notifications`, `/admin/settings`, `/admin/areas`, `/admin/more`, `/admin/login` | Layout shell + nav + bottom padding applied. |

---

## Privacy checks (code / rules)

| Rule | Result |
|------|--------|
| Public doctor cards/pages never show phone/WhatsApp | **Pass** (unchanged public modules). |
| Doctor list: no contact before accept | **Pass** (existing list/detail APIs and UI flags). |
| Doctor detail: contact only for assigned/accepted owner | **Pass** (unchanged server rules). |
| Other doctors: peer locked, no sensitive details | **Pass** (`AppLockedState` / `isPeerLocked` paths retained; quick status skipped when locked on leads list). |
| Admin: full lead detail | **Pass** (admin routes unchanged in authorization). |

_No automated E2E was run; verification is by code path review plus successful production build._

---

## Newest-first checks

| Surface | Result |
|---------|--------|
| Admin dashboard “recent 10” | **Pass** — `orderBy: { createdAt: "desc" }` unchanged in `src/app/admin/page.tsx`. |
| Doctor/admin list APIs | **Pass** — no ordering changes this pass; prior work assumed for `createdAt desc`. |

---

## Doctor locked-lead / stats

| Check | Result |
|-------|--------|
| Peer locked card UX | **Pass** — locked path still uses dedicated UI; filters/quick actions respect `isPeerLocked`. |
| Dashboard stats not inflated by peer previews | **Pass** — no changes to counting queries this pass; prior `my-stats` / list filtering logic retained. |

---

## Test command results (2026-05-06)

Commands were re-run after the **duplicate admin route** cleanup; results unchanged.

| Command | Result |
|---------|--------|
| `npx prisma generate` | **OK** |
| `npx prisma validate` | **OK** (`The schema at prisma\schema.prisma is valid`) |
| `npm run lint` | **OK** (0 errors, 0 warnings after fixes) |
| `npm run typecheck` | **OK** |
| `npm run build` | **OK** (Next.js 16.2.4 Turbopack; exit code 0) |

Build emitted: `The "middleware" file convention is deprecated. Please use "proxy" instead.` — informational only; **no middleware change** in this pass (low-risk policy respected).

---

## Remaining limitations

1. **Admin inner pages** — Many screens still mix legacy typography (`text-zinc-*`) with new shells; further consolidation on **`AppField` / `AppButton`** for forms is optional polish.
2. **Desktop tables** — Wide tables (e.g. admin dashboard LG+, requests) intentionally kept for ops; mobile-first cards added where already present or on dashboard mobile list.
3. **Middleware → proxy** — Documented by Next.js; migration deferred.
4. **Media uploads** — Out of scope; URL/placeholder behavior unchanged.
5. **`narrow` prop on `AdminNav`** — Still passed from some pages for future layout hints; currently a no-op after header redesign (`void narrow` in `AdminNavBar`).

---

## Final production-readiness status

**Ready for staging smoke** with the usual caveats: run the app at **390–430px** and desktop widths, verify auth cookies, and spot-check accept / peer-lock / admin lead detail in a real browser.

- **Build:** green.  
- **Schema:** valid; no destructive migrations run.  
- **Dependencies:** no heavy new packages added.

---

## Files touched (summary)

- `src/app/admin/layout.tsx`, `src/app/admin/(shell)/layout.tsx`, `src/lib/admin-nav.ts`
- Logged-in admin UI: **`src/app/admin/(shell)/**`** only (e.g. `page.tsx`, `areas/page.tsx`, `requests/page.tsx`, …); duplicate **`src/app/admin/**/page.tsx`** copies outside **`(shell)`** removed (see “Duplicate `/admin/areas` route conflict” above).
- `src/components/admin/AdminNavBar.tsx`
- `src/app/admin/login/AdminLoginClient.tsx`, `src/app/admin/login/page.tsx` (fallback copy)
- `src/app/doctor/settings/page.tsx`, `src/app/doctor/apply/page.tsx`, `src/app/doctor/login/*`
- `src/components/doctor/DoctorSettingsForm.tsx`, `DoctorLeadsFilters.tsx`, `DoctorLeadQuickStatus.tsx`, `DoctorLeadWorkflowPanel.tsx`, `DoctorObservationForm.tsx`, `LeadStatusTimeline.tsx`
- Removed: `src/components/doctor/DoctorNavBar.tsx`
