# Qurbani 2026 Mobile App Redesign Master Plan

Audit date: 2026-05-06

Scope: redesign the existing Qurbani 2026 web app into a premium, mobile-first, app-like Bengali experience while preserving all working customer, doctor, and admin functionality.

## 0. Audit Summary

Current project health:

- `npm run lint` ✅
- `npm run typecheck` ✅
- `npx prisma validate` ✅
- `npm run build` ✅

Important technical note:

- Next.js 16 build warns that `src/middleware.ts` uses a deprecated file convention and should be renamed to `proxy.ts` in a later safe cleanup pass.

Overall conclusion:

- The app already has a solid functional base: public lead intake, doctor applications, doctor portal, admin portal, area-based routing, lead privacy helpers, assignment workflow, notes, case completion, reports, notifications, and site settings.
- The main gap is not “missing system logic”; it is an inconsistent UI architecture and a few business-rule mismatches.
- The redesign should be done as a shell + design-system refactor first, then route-by-route screen modernization, then targeted logic fixes where the current behavior conflicts with the Qurbani 2026 rules.

Primary rule conflicts found in the current code:

- Newest leads are not always first. Several lists sort by `priority DESC, createdAt DESC` instead of `createdAt DESC`.
- Doctors do not generally see “locked by another doctor” leads in shared areas; they mostly see only assigned-to-me leads plus unassigned leads in covered areas. This conflicts with the requirement that other doctors should see locked state without seeing contact details.
- Admin can seed/use areas, but there is no admin area-management screen yet.
- Admin doctor creation is functional, but the initial create flow does not expose the full public profile fields required by the target product direction.
- Reports exist, but they are table-style summaries, not premium chart-card dashboards.

## 1. Current Route / Page Inventory

### 1.1 Customer / Public Pages

| Route | File | Purpose | Current status |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Public landing page with hero, trust sections, doctor preview, checklist, CTA | Working, UI partial |
| `/request` | `src/app/request/page.tsx` | Public lead request form page | Working, UI partial |
| `/thank-you` | `src/app/thank-you/page.tsx` | Post-submit confirmation | Working, UI partial |
| `/offline` | `src/app/offline/page.tsx` | Offline fallback | Working |
| `/doctor/apply` | `src/app/doctor/apply/page.tsx` | Public doctor application entry page | Working, UI partial |

### 1.2 Doctor Pages

| Route | File | Purpose | Current status |
|---|---|---|---|
| `/doctor/login` | `src/app/doctor/login/page.tsx` + `DoctorLoginClient.tsx` | Doctor login | Working, UI partial |
| `/doctor` | `src/app/doctor/page.tsx` | Doctor dashboard / stats / recent leads | Working, UI partial |
| `/doctor/leads` | `src/app/doctor/leads/page.tsx` | Doctor lead list with filters and quick actions | Working, logic partial |
| `/doctor/leads/[id]` | `src/app/doctor/leads/[id]/page.tsx` | Doctor lead detail, accept/lock, workflow, observations, notes | Working, UI partial |
| `/doctor/settings` | `src/app/doctor/settings/page.tsx` | Doctor self-profile, area preference, password change | Working, UI partial |

### 1.3 Admin Pages

| Route | File | Purpose | Current status |
|---|---|---|---|
| `/admin` | `src/app/admin/page.tsx` | Admin dashboard | Working, UI partial |
| `/admin/requests` | `src/app/admin/requests/page.tsx` | Canonical admin lead list | Working, logic partial |
| `/admin/leads` | `src/app/admin/leads/page.tsx` | Legacy redirect to `/admin/requests` | Working |
| `/admin/leads/[id]` | `src/app/admin/leads/[id]/page.tsx` | Lead detail, notes, assignment, status, case report view | Working, UI partial |
| `/admin/doctors` | `src/app/admin/doctors/page.tsx` | Doctor list and activation toggle | Working, UI partial |
| `/admin/doctors/new` | `src/app/admin/doctors/new/page.tsx` | Create doctor | Working, functionality partial |
| `/admin/doctors/[id]/edit` | `src/app/admin/doctors/[id]/edit/page.tsx` | Edit doctor profile, areas, flags | Working, UI partial |
| `/admin/doctor-applications` | `src/app/admin/doctor-applications/page.tsx` | Doctor applicant list | Working, UI partial |
| `/admin/doctor-applications/[id]` | `src/app/admin/doctor-applications/[id]/page.tsx` | Doctor applicant detail + review/convert | Working, UI partial |
| `/admin/reports` | `src/app/admin/reports/page.tsx` | Doctor performance summary | Working, UI/functionality partial |
| `/admin/notifications` | `src/app/admin/notifications/page.tsx` | Notification queue | Working, UI/functionality partial |
| `/admin/settings` | `src/app/admin/settings/page.tsx` | Site settings | Working, UI partial |

Missing admin route recommended:

| Proposed route | Reason |
|---|---|
| `/admin/areas` | Required to fully satisfy “admin can manage areas” without changing existing public/doctor flows |

### 1.4 Auth Pages

| Route | File | Purpose | Current status |
|---|---|---|---|
| `/admin/login` | `src/app/admin/login/page.tsx` + `AdminLoginClient.tsx` | Admin/staff login | Working, UI partial |
| `/doctor/login` | `src/app/doctor/login/page.tsx` + `DoctorLoginClient.tsx` | Doctor login | Working, UI partial |

### 1.5 API / Route Handler Inventory

Public:

- `POST /api/leads` → `src/app/api/leads/route.ts`
- `GET /api/areas` → `src/app/api/areas/route.ts`
- `POST /api/doctor-applications` → `src/app/api/doctor-applications/route.ts`

Doctor auth / profile:

- `POST /api/doctor/login`
- `GET|POST /api/doctor/logout`
- `GET|PATCH /api/doctor/me`
- `PATCH /api/doctor/me/password`
- `POST /api/doctor/me/area-preference`
- `GET /api/doctor/my-stats`

Doctor leads:

- `GET /api/doctor/leads`
- `GET /api/doctor/leads/[id]`
- `POST /api/doctor/leads/[id]/accept`
- `PATCH /api/doctor/leads/[id]/status`
- `POST /api/doctor/leads/[id]/start-treatment`
- `PATCH /api/doctor/leads/[id]/case-report`
- `POST /api/doctor/leads/[id]/observations`
- `POST /api/doctor/leads/[id]/complete`

Admin auth / settings:

- `POST /api/admin/login`
- `GET /api/admin/logout`
- `GET|PATCH /api/admin/settings`

Admin leads:

- `GET /api/admin/leads`
- `GET|PATCH|DELETE /api/admin/leads/[id]`
- `PATCH /api/admin/leads/[id]/status`
- `POST /api/admin/leads/[id]/notes`
- `PATCH /api/admin/leads/[id]/assign-doctor`

Admin doctors:

- `GET|POST /api/admin/doctors`
- `GET|PATCH|DELETE /api/admin/doctors/[id]`
- `PUT /api/admin/doctors/[id]/areas`
- `GET /api/admin/doctors/performance`

Admin doctor applications:

- `GET /api/admin/doctor-applications`
- `GET|PATCH /api/admin/doctor-applications/[id]`
- `POST /api/admin/doctor-applications/[id]/convert`

Server actions:

- None found. The app currently uses route handlers plus server-rendered pages/components.

## 2. Existing Functionality Status

### 2.1 Working

- Public lead submission with Bangladesh phone normalization and area validation.
- Area seed data and searchable public area selection.
- Public doctor preview that does not expose doctor phone or WhatsApp.
- Doctor application submission and admin review/convert flow.
- Cookie-based admin and doctor auth.
- Doctor can accept pool leads and access contact info only after assignment/acceptance.
- Admin can see full lead details, assign doctors, change status, and add notes.
- Doctor case workflow supports start, observe, report draft, and complete.
- Notification rows are queued and visible in admin.
- Site settings are database-backed and editable.

### 2.2 Partial

- Mobile responsiveness exists, but the product still feels like a responsive admin website instead of a premium mobile app.
- Doctor lead visibility is privacy-aware, but the “locked by another doctor” preview experience is not consistently available.
- Lead sorting favors priority first in several views; this partially conflicts with “newest first”.
- Doctor create flow is functional, but profile fields are split between create and edit.
- Reports are operational summaries, but not premium dashboards with chart cards.
- Notifications page is a queue viewer, not a richer management experience.
- Doctor and admin nav patterns work, but they are top-nav/drawer driven, not sticky app-shell navigation.
- Public request form works, but it is still a single card form rather than the requested premium tabbed/mobile flow.

### 2.3 Missing

- Shared premium mobile design system.
- Unified mobile shell for customer, doctor, and admin sections.
- Sticky bottom navigation on mobile.
- Admin area-management page and corresponding CRUD routes.
- Locked-area peer-lead discovery for doctors with privacy-safe locked previews.
- Chart-style reports dashboard.
- Consistent empty/loading/error states across key pages.
- Route-level skeleton/loading strategy.

### 2.4 Broken / Risky / Conflicting

- `src/middleware.ts` uses a deprecated Next.js 16 convention; safe migration to `proxy.ts` should be planned.
- `README.md` is outdated and still describes older doctor/admin behavior.
- `src/lib/doctor-lead-access.ts` explicitly sorts doctor lists by priority first, conflicting with newest-first business rules.
- Admin request page also sorts by priority first in the page query.
- In-memory rate limiting in `src/lib/public-rate-limit.ts` is acceptable for local/single-instance use but is operationally risky for production scaling.
- Media support is URL-list based only; no real upload pipeline exists yet.
- Existing design tokens are minimal (`globals.css` only defines a few root colors), which makes route-by-route UI drift likely unless a shared design system is introduced first.

## 3. Exact Target Page List In Execution Order

The safest implementation order is:

1. Design foundation and global mobile shell primitives.
2. Public customer shell wrapper and shared CTA/header/footer cleanup.
3. `/` customer home redesign.
4. `/request` premium request form redesign.
5. `/thank-you` premium success screen redesign.
6. `/doctor/login` redesign.
7. `/doctor` dashboard redesign.
8. `/doctor/leads` redesign plus locked-preview rule update.
9. `/doctor/leads/[id]` detail redesign plus privacy-state polish.
10. `/doctor/settings` redesign.
11. `/doctor/apply` redesign.
12. `/admin/login` redesign.
13. `/admin` dashboard redesign.
14. `/admin/requests` redesign plus newest-first rule fix.
15. `/admin/leads/[id]` detail redesign.
16. `/admin/doctors` redesign.
17. `/admin/doctors/new` and `/admin/doctors/[id]/edit` redesign.
18. `/admin/doctor-applications` redesign.
19. `/admin/doctor-applications/[id]` redesign.
20. `/admin/reports` redesign with chart cards.
21. `/admin/notifications` redesign.
22. `/admin/settings` redesign.
23. `/admin/areas` add only if approved as part of required flow completion.
24. Technical debt cleanup: `middleware` → `proxy`, README refresh, polish pass.

## 4. Shared Design System Plan

### 4.1 Colors

Target palette:

- Primary green: deep veterinary green for headers, CTAs, active nav, success
- Soft green tint: section backgrounds, chips, subtle panels
- Gold accent: premium highlights, KPI accents, section markers, selected states
- White / warm ivory: primary app surfaces
- Neutral stone/zinc scale: text, borders, disabled states
- Alert colors: red for emergency, amber for warnings, sky/blue for informational states

Implementation direction:

- Replace minimal root color variables in `src/app/globals.css` with a reusable token set.
- Keep strong contrast for Bengali body text and dense dashboard data.
- Avoid dark-mode-first styling; optimize the premium light theme first.

### 4.2 Typography

- Use a more intentional Bengali-friendly font stack instead of the current plain Geist-only feel.
- Keep a separate display style for hero headings and KPI cards.
- Define explicit text roles: app title, section title, card title, stat number, field label, helper text, badge text.

### 4.3 Layout

- Mobile-first max width around app-phone proportions for public and portal screens.
- Create a reusable “mobile app canvas” with:
  - top safe-area spacing
  - bottom safe-area spacing
  - rounded content sheets/cards
  - page sections separated by consistent spacing
- Preserve desktop usability by centering the mobile shell within a larger neutral canvas, not by reverting to a desktop admin table layout.

### 4.4 Mobile Shell

- Create section-specific shells:
  - Customer shell
  - Doctor shell
  - Admin shell
- Each shell should support:
  - sticky top app header
  - scrollable content area
  - sticky bottom navigation on mobile
  - optional desktop side/top navigation fallback

### 4.5 App Header

- Compact branded header with title, subtitle/status, contextual action slot.
- Public pages: hero-style header or page-specific back header.
- Doctor/admin pages: title + secondary status + menu/actions.

### 4.6 Bottom Nav

Customer:

- Home
- Request
- Call / Support CTA

Doctor:

- Dashboard
- Leads
- Settings

Admin:

- Dashboard
- Leads
- Doctors
- Reports
- More

### 4.7 Cards

- Large rounded corners.
- Soft shadow hierarchy with one premium shadow style, one flat inset style.
- Distinct card variants:
  - hero card
  - KPI card
  - lead card
  - doctor profile card
  - chart card
  - status/empty state card

### 4.8 Buttons

- Primary filled green
- Secondary outlined green
- Gold accent action
- Neutral ghost action
- Destructive/warning styles for emergency/cancel actions
- Minimum touch height `48px+`

### 4.9 Badges

- Lead priority badges
- Lead status badges
- Locked/privacy badges
- Active/inactive doctor badges
- Pending/reviewed application badges

### 4.10 Form Fields

- Unified field container with label, helper, error, icon slot
- Searchable area selects updated to match premium app inputs
- Clean segmented/tab selectors for request types / urgency / workflow states
- Map-style location block for customer address/area summary on request flow

### 4.11 Empty / Loading / Error States

- Shared empty state card
- Shared error card
- Shared full-page loading skeleton
- Shared list skeleton
- Shared “locked/private” state card for doctor lead previews

## 5. Component Architecture

### 5.1 Shared UI Components

Proposed new shared layer:

- `src/components/ui/AppShell.tsx`
- `src/components/ui/AppHeader.tsx`
- `src/components/ui/BottomNav.tsx`
- `src/components/ui/AppCard.tsx`
- `src/components/ui/AppButton.tsx`
- `src/components/ui/AppBadge.tsx`
- `src/components/ui/AppSection.tsx`
- `src/components/ui/AppEmptyState.tsx`
- `src/components/ui/AppErrorState.tsx`
- `src/components/ui/AppStatCard.tsx`
- `src/components/ui/AppField.tsx`
- `src/components/ui/AppTextarea.tsx`
- `src/components/ui/AppSelect.tsx`
- `src/components/ui/AppSearchInput.tsx`

### 5.2 Customer Components

Keep and refactor:

- `HeroSection`
- `DoctorPreviewSection`
- `SimpleRequestForm`
- `StickyLandingCta`
- area / trust / FAQ / checklist sections

Add likely new components:

- customer home hero animal card
- customer quick action strip
- request form segmented tabs
- request summary/location block
- success state panel

### 5.3 Doctor Components

Keep and refactor:

- `DoctorNavBar`
- `DoctorLeadsNav`
- `DoctorLeadsFilters`
- `DoctorLeadQuickStatus`
- `DoctorLeadWorkflowPanel`
- `DoctorObservationForm`
- `LeadStatusTimeline`
- `DoctorSettingsForm`

Add likely new components:

- doctor KPI rail
- doctor lead list card
- locked lead preview card
- accepted lead action footer
- doctor dashboard summary carousel

### 5.4 Admin Components

Keep and refactor:

- `AdminNavBar`
- `AdminNav`
- `AdminLeadsFilterForm`
- `AssignDoctorForm`
- `LeadStatusForm`
- `LeadNoteForm`
- `DoctorForm`
- `DoctorEditForm`
- `DoctorApplicationActions`
- `AdminSettingsForm`

Add likely new components:

- admin KPI card grid
- admin lead list card
- admin doctor roster card
- report chart card
- area management card set

## 6. Data / Privacy Rules Implementation Plan

### 6.1 Public Doctor Number Hiding

Current state:

- Already respected in the public doctor preview loader/component.

Plan:

- Preserve the current no-phone/no-WhatsApp policy in public loaders and components.
- Keep public doctor preview payload limited to safe fields only.
- Ensure redesign does not accidentally surface `phone` or `whatsapp` in hero cards, doctor modals, or quick actions.

### 6.2 Doctor Lead Preview

Current state:

- Doctor list uses privacy-safe summaries, but usually excludes leads assigned to other doctors.

Required change:

- Expand doctor list visibility so doctors can see:
  - leads assigned to themselves
  - unassigned leads in their covered areas
  - covered-area leads already locked by another doctor, but only as redacted preview rows

Preview fields should include only:

- customer name
- area
- animal type
- problem summary
- time ago / created time
- priority
- status
- locked state / mine / pool state

Preview fields must not include:

- phone
- WhatsApp
- address
- map link
- detailed customer note

### 6.3 Lead Accept / Lock

Current state:

- `POST /api/doctor/leads/[id]/accept` already supports self-claim from pool and accept of admin-assigned leads.

Plan:

- Preserve current transaction logic and history creation.
- Add clearer UI state transitions:
  - pool
  - assigned to me
  - locked by another doctor
  - completed/cancelled/referred

### 6.4 Contact Visibility After Accept

Current state:

- Implemented through `canDoctorViewLeadCustomerContact` and detail sanitization.

Plan:

- Keep current backend privacy enforcement.
- Make the UI more explicit:
  - hidden contact state card before accept
  - unlocked contact action bar after accept
  - locked-by-other state card for peers

### 6.5 Admin Full Access

Current state:

- Admin detail pages and APIs have full access.

Plan:

- Preserve full access for admin/staff.
- Keep admin-only detail route under `/admin/leads/[id]`.
- Ensure any new doctor locked-preview logic remains doctor-only; admin should still see raw contact and workflow data.

## 7. Required Backend / Schema / API Changes

### 7.1 Required logic changes

1. Update doctor lead visibility logic.

- Primary files:
  - `src/lib/doctor-lead-access.ts`
  - `src/app/api/doctor/leads/route.ts`
  - `src/app/doctor/leads/page.tsx`
- Goal:
  - include locked peer leads in covered areas as redacted previews
  - keep detail/contact access restricted

2. Update lead ordering to newest-first.

- Primary files:
  - `src/lib/doctor-lead-access.ts`
  - `src/app/admin/requests/page.tsx`
  - `src/app/admin/page.tsx` if recent lead lists need alignment
  - `src/app/api/admin/leads/route.ts`
  - `src/app/api/doctor/leads/route.ts`
- Goal:
  - default list order should be `createdAt DESC`
  - priority stays a badge/filter, not the primary default sort

3. Add admin area management if approved.

- Proposed files:
  - `src/app/admin/areas/page.tsx`
  - `src/app/api/admin/areas/route.ts`
  - `src/app/api/admin/areas/[id]/route.ts`
- Schema change likely not required because `Area` already has `slug`, `name`, `nameBn`, `sortOrder`, `isActive`.

4. Expand doctor creation flow to support fuller profile input earlier.

- Primary files:
  - `src/components/admin/DoctorForm.tsx`
  - `src/app/api/admin/doctors/route.ts`

### 7.2 Schema changes

Recommended default:

- No schema change in phase 1.

Reason:

- Existing `Area`, `Lead`, `User`, `DoctorArea`, `DoctorApplication`, `Notification`, `LeadCaseReport`, and history tables are already sufficient for the redesign and privacy rules.

Only consider schema changes if one of these becomes necessary later:

- richer area metadata beyond current columns
- file-upload assets table
- persisted dashboard/report snapshots

### 7.3 Technical debt change

- Rename `src/middleware.ts` to supported Next.js 16 `proxy.ts` location after UI work stabilizes.

## 8. Required Seed / Migration Changes For Areas

Current state:

- Areas already exist in Prisma schema and are seeded in `prisma/seed.ts`.
- Public/customer area search already depends on live `Area` rows.

Plan:

- Keep areas coming from migration/seed data as the source of truth.
- Do not replace areas with hardcoded frontend lists.
- If business wants more service zones, update `prisma/seed.ts` with the expanded area list.
- If `/admin/areas` is added, no migration is required unless new fields are requested.

Recommended seed follow-up:

- Review whether the current seed list is complete enough for the 2026 campaign.
- Confirm final Bengali spellings and sort order.

## 9. Exact File-by-File Implementation Checklist

### 9.1 Foundation / Design System

- Update `src/app/globals.css`
- Update `src/app/layout.tsx`
- Add `src/components/ui/AppShell.tsx`
- Add `src/components/ui/AppHeader.tsx`
- Add `src/components/ui/BottomNav.tsx`
- Add `src/components/ui/AppCard.tsx`
- Add `src/components/ui/AppButton.tsx`
- Add `src/components/ui/AppBadge.tsx`
- Add `src/components/ui/AppSection.tsx`
- Add `src/components/ui/AppEmptyState.tsx`
- Add `src/components/ui/AppErrorState.tsx`
- Add `src/components/ui/AppStatCard.tsx`
- Add `src/components/ui/AppField.tsx`
- Add `src/components/ui/AppTextarea.tsx`
- Add `src/components/ui/AppSelect.tsx`

### 9.2 Customer / Public Flow

- Update `src/app/page.tsx`
- Update `src/app/request/page.tsx`
- Update `src/app/thank-you/page.tsx`
- Update `src/app/offline/page.tsx`
- Update `src/components/landing/HeroSection.tsx`
- Update `src/components/landing/DoctorPreviewSection.tsx`
- Update `src/components/landing/StickyLandingCta.tsx`
- Update `src/components/landing/SimpleRequestForm.tsx`
- Update `src/components/forms/SearchableAreaSelect.tsx`
- Update `src/components/landing/AreaCoverageSection.tsx`
- Update `src/components/landing/HowItWorksSection.tsx`
- Update `src/components/landing/TrustSection.tsx`
- Update `src/components/landing/FaqSection.tsx`
- Keep `src/lib/landing-public-data.ts` privacy-safe and confirm no phone exposure

### 9.3 Doctor Flow

- Update `src/app/doctor/login/DoctorLoginClient.tsx`
- Update `src/app/doctor/page.tsx`
- Update `src/app/doctor/leads/page.tsx`
- Update `src/app/doctor/leads/[id]/page.tsx`
- Update `src/app/doctor/settings/page.tsx`
- Update `src/app/doctor/apply/page.tsx`
- Update `src/components/doctor/DoctorNavBar.tsx`
- Update `src/components/doctor/DoctorLeadsNav.tsx`
- Update `src/components/doctor/DoctorLeadsFilters.tsx`
- Update `src/components/doctor/DoctorLeadQuickStatus.tsx`
- Update `src/components/doctor/DoctorLeadWorkflowPanel.tsx`
- Update `src/components/doctor/DoctorObservationForm.tsx`
- Update `src/components/doctor/DoctorSettingsForm.tsx`
- Update `src/components/doctor/LeadStatusTimeline.tsx`

### 9.4 Admin Flow

- Update `src/app/admin/login/AdminLoginClient.tsx`
- Update `src/app/admin/page.tsx`
- Update `src/app/admin/requests/page.tsx`
- Update `src/app/admin/leads/[id]/page.tsx`
- Update `src/app/admin/doctors/page.tsx`
- Update `src/app/admin/doctors/new/page.tsx`
- Update `src/app/admin/doctors/[id]/edit/page.tsx`
- Update `src/app/admin/doctor-applications/page.tsx`
- Update `src/app/admin/doctor-applications/[id]/page.tsx`
- Update `src/app/admin/reports/page.tsx`
- Update `src/app/admin/notifications/page.tsx`
- Update `src/app/admin/settings/page.tsx`
- Update `src/components/admin/AdminNav.tsx`
- Update `src/components/admin/AdminNavBar.tsx`
- Update `src/components/admin/AdminLeadsFilterForm.tsx`
- Update `src/components/admin/AssignDoctorForm.tsx`
- Update `src/components/admin/LeadStatusForm.tsx`
- Update `src/components/admin/LeadNoteForm.tsx`
- Update `src/components/admin/DoctorForm.tsx`
- Update `src/components/admin/DoctorEditForm.tsx`
- Update `src/components/admin/DoctorApplicationActions.tsx`
- Update `src/components/admin/AdminSettingsForm.tsx`
- Update `src/components/admin/BrowserNotifyHint.tsx`

### 9.5 Data / Privacy / Ordering

- Update `src/lib/doctor-lead-access.ts`
- Update `src/lib/lead-privacy.ts`
- Update `src/lib/lead-workflow.ts` only if new locked-preview helper states are needed
- Update `src/app/api/doctor/leads/route.ts`
- Update `src/app/api/doctor/leads/[id]/route.ts` only if payload flags need expansion
- Update `src/app/api/admin/leads/route.ts`
- Update `src/app/api/admin/doctors/route.ts`
- Update `src/app/api/admin/doctors/[id]/route.ts` if create/edit parity is improved

### 9.6 Areas Management

Only if approved in scope:

- Add `src/app/admin/areas/page.tsx`
- Add `src/components/admin/AreaForm.tsx`
- Add `src/components/admin/AreaListCard.tsx`
- Add `src/app/api/admin/areas/route.ts`
- Add `src/app/api/admin/areas/[id]/route.ts`
- Review `prisma/seed.ts`

### 9.7 Technical Debt / Cleanup

- Rename `src/middleware.ts` to Next.js 16-compatible `proxy.ts`
- Update `README.md` after implementation

## 10. QA Checklist

Automated:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npx prisma generate`
- `npx prisma validate`
- `npm run db:seed`

Manual customer flow:

- Home page loads with premium mobile shell on narrow screens
- Request form works end-to-end
- Area search works
- Emergency/urgent controls respect settings
- Submission redirects to redesigned thank-you page
- Public doctor cards do not show phone or WhatsApp

Manual doctor flow:

- Doctor login works
- Dashboard KPIs load
- Lead list shows newest-first
- Covered-area unassigned leads are visible
- Covered-area leads locked by another doctor appear as locked previews without contact data
- Accepting a pool lead unlocks contact details only for the accepting doctor
- Other doctors still cannot see contact details
- Doctor can move workflow through accept/start/observe/complete
- Doctor settings save correctly
- Doctor area preference submission still works

Manual admin flow:

- Admin login works
- Dashboard loads redesigned KPI cards
- Lead list filters still work
- Lead detail still supports assignment, note creation, and status change
- Doctor create/edit still works
- Doctor application review and convert still works
- Reports page loads chart cards without breaking data accuracy
- Notifications page still lists latest queue rows
- Settings save correctly
- If `/admin/areas` is added, add/edit/disable area works and public area search reflects active areas

Data/privacy checks:

- Public doctor pages never expose phone or WhatsApp
- Doctor list never exposes phone/WhatsApp before acceptance
- Locked peer leads are visible only as safe previews
- Only assigned doctor and admin can see customer contact details
- Admin retains full access after redesign

Regression checks:

- `/admin/leads` still redirects to `/admin/requests`
- `/admin/leads/[id]` remains the lead detail route
- Existing cookies/sessions still guard admin and doctor routes
- No route name regressions

## 11. Recommended Implementation Strategy

Risk-minimizing approach:

- Do not start by rewriting all pages independently.
- Start by building the shared shell and UI primitives once.
- Re-skin existing working components where possible before replacing logic.
- Keep current route names.
- Keep current Prisma schema unless a later phase proves a schema change is unavoidable.
- Keep lead-privacy enforcement server-side; do not move privacy decisions into client-only logic.
- Defer optional new functionality such as area CRUD until core redesign routes are visually stable.

## 12. Short Implementation Sequence

1. Build the shared premium mobile design system and shell.
2. Redesign the customer flow (`/`, `/request`, `/thank-you`).
3. Redesign the doctor flow and fix locked-preview plus newest-first rules.
4. Redesign the admin flow and fix newest-first ordering everywhere.
5. Upgrade reports, notifications, and settings.
6. Add admin area management only if approved as required scope.
7. Finish with QA, `proxy.ts` migration, and documentation cleanup.
