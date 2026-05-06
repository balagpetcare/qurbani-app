# Responsive / mobile UI audit and fixes (2026-05-06)

## Pages and components reviewed

- **Landing:** `src/app/page.tsx`, `src/components/landing/*` (hero, sections, lead form, sticky CTA, doctor application form).
- **Forms:** `SearchableAreaSelect`, `SearchableAreaMultiSelect`, `LeadForm`, `DoctorApplicationForm`, admin `DoctorForm` / `DoctorEditForm`, `AdminLeadsFilterForm`.
- **Admin:** `AdminNav`, dashboard, requests, doctors list/edit/new, doctor applications, lead detail, notifications, reports, login.
- **Doctor:** `DoctorLeadsNav`, dashboard, leads list/detail, login, apply page.
- **Other:** `src/app/layout.tsx`, `src/app/globals.css`, thank-you page.
- **Risky Tailwind scan:** searched for `w-[`, `min-w-[`, `max-w-none`, large headings, dense grids (`grid-cols-4` / `5`), `overflow-hidden`, `fixed`, `absolute`, `h-screen`, `min-h-screen`. Reviewed matches in admin/doctor tables, `HeroSection` (`md:text-5xl`), doctor leads stats grid, filter forms, and `DoctorLeadQuickStatus` (`min-w-[12rem]`).

## Root responsive issues found

1. **Horizontal overflow risk:** long Bengali labels, wide nav rows, and fixed `min-w-*` on small components could force sideways scroll; tables already used `min-w-[960px]`+ with `overflow-x-auto` on desktop breakpoints, but the **root** needed guardrails.
2. **Nav on narrow screens:** admin and doctor headers used wrapping link rows without scroll or consistent touch targets; long subtitles could crowd the layout.
3. **Touch targets:** many filters and login fields used short `py-2` / small chips; not ideal for mobile.
4. **Typography / spacing:** several landing blocks used tight horizontal padding (`px-2`); hero and section headings could scale more predictably across breakpoints.
5. **Doctor dashboard stats:** six columns on `lg` was cramped on medium widths; adjusted to a more progressive grid.
6. **Doctor login:** layout was a single card without full-height/safe-area framing; JSX structure was corrected after refactor.

## Changed files (summary)

| Area | Files |
|------|--------|
| Global | `src/app/globals.css`, `src/app/layout.tsx` |
| Landing shell | `src/app/page.tsx`, `HeroSection.tsx`, `VideoAdviceSection.tsx`, `StickyLandingCta.tsx`, multiple section files (`Service`, `Trust`, `Faq`, `HowItWorks`, `CaseShowcase`, `ProblemCategoryCards`, `PreQurbani`, `DoctorPreview`, `AreaCoverage`), `LeadForm.tsx`, `DoctorApplicationForm.tsx` |
| Forms | `SearchableAreaSelect.tsx`, `SearchableAreaMultiSelect.tsx` |
| Admin chrome | `AdminNav.tsx`, `AdminLeadsFilterForm.tsx`, `DoctorForm.tsx`, `DoctorEditForm.tsx`, `AdminLoginClient.tsx`, main wrappers on admin pages (`admin/page.tsx`, `requests`, `doctors`, `doctor-applications`, `notifications`, `reports`, `leads/[id]`, `doctors/new`, `doctors/[id]/edit`, `doctor-applications/[id]`) |
| Doctor | `DoctorLeadsNav.tsx`, `DoctorLeadsFilters.tsx`, `DoctorLeadQuickStatus.tsx`, `doctor/page.tsx`, `doctor/leads/page.tsx`, `doctor/leads/[id]/page.tsx`, `doctor/apply/page.tsx`, `DoctorLoginClient.tsx` |
| Other | `thank-you/page.tsx` |

## Mobile fixes (concise)

- **`html` / `body`:** `overflow-x: clip` and `min-width: 0` on `body` to reduce accidental horizontal scroll; `text-rendering: optimizeLegibility` for Bengali readability.
- **Root layout:** `body` uses `min-w-0` flex column for flex overflow safety.
- **Admin & doctor headers:** title block `min-w-0` + `break-words`; nav uses **horizontal scroll** on small screens, larger tap areas, `touch-manipulation`; content max-width still driven by `narrow` / default on `AdminNav`.
- **Admin/doctor `<main>`:** consistent `w-full min-w-0`, `py-6 sm:py-8`, `lg:px-8` where applicable.
- **Landing:** increased horizontal padding to `px-4 sm:px-6 lg:px-8` on hero/video and multiple sections; responsive heading sizes and `leading-relaxed` where helpful; lead form container `min-w-0`.
- **Forms:** `min-h-[48px]` (or larger) on primary inputs/selects; textareas get `min-h-[*]` + `leading-relaxed`; full-width primary actions on small screens for admin doctor save buttons; filter **Apply / Clear** stack on mobile with 48px min height.
- **Doctor dashboard:** stat grid `sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6` (was `lg:grid-cols-6`).
- **Doctor leads:** filter tabs scroll horizontally; area select full width on mobile; mobile cards use `min-w-0` + `break-words` on long fields; quick-status column uses `w-full min-w-0` on small screens with taller action buttons.
- **Sticky landing CTA:** full-width nav with `min-w-0` + `break-words` on labels.
- **Thank-you / doctor apply:** `overflow-x-clip` + `min-w-0` where needed; safer vertical padding with safe-area.
- **Admin requests pagination:** larger touch-friendly prev/next controls.

## Commands run and results

| Command | Result |
|--------|--------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass (Next.js 16.2.4 / Turbopack) |

## Remaining known limitations

- **Admin/doctor tables** at `md`/`lg` and up remain wide by design; they stay inside `overflow-x-auto` containers. Very small landscape phones may still scroll horizontally inside those panels—not full-page if the global clip behaves as intended.
- **Secondary admin UI** (e.g. assign-doctor widgets, note forms, workflow panels) was not exhaustively retuned; patterns match the rest of the app but individual fields may still use older vertical padding.
- **No new mobile drawer** was added for navigation; admin/doctor nav scrolls horizontally on small screens instead of a hamburger menu (minimal change, stable behavior).
- **Browser verification** of every route was not automated; spot-check recommended on real devices for `/`, `/admin/login`, `/admin`, `/admin/requests`, `/admin/doctors`, `/doctor/login`, `/doctor`, `/doctor/leads/:id`, `/doctor/apply`.
