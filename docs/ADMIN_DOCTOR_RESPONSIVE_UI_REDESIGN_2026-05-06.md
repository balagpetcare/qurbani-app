# Admin & doctor panels — responsive UI refresh (2026-05-06)

UI/UX and responsive layout only. No Prisma, auth, API, or lead/treatment workflow changes.

## Pages reviewed / touched

**Admin:** dashboard (`/admin`), requests (`/admin/requests`), lead detail (`/admin/leads/[id]`), doctors (`/admin/doctors`), doctor applications (`/admin/doctor-applications`), reports (`/admin/reports`), notifications (`/admin/notifications`), settings (`/admin/settings`).

**Doctor:** dashboard (`/doctor`), leads (`/doctor/leads`), lead detail (`/doctor/leads/[id]`).

**Shared navigation:** `AdminNav`, `DoctorLeadsNav` (now backed by client nav bars).

## Responsive problems addressed

1. **Horizontal nav on small screens** forced awkward horizontal scrolling; **active route** was not obvious.
2. **Lead lists** used `md:` breakpoints inconsistently; tablets saw wide tables in some admin views.
3. **Admin requests** mobile cards lacked a **direct call** action; primary CTA still said “View”.
4. **Typography / hierarchy** on admin dashboard mixed English labels with Bengali subtitles.
5. **Safe area / bottom padding** missing on several long `main` regions (notch/home indicator).
6. **Doctor lead detail** used a tight `grid-cols-2` for actions on narrow phones.

## New / updated reusable components

| Component | Path | Role |
|-----------|------|------|
| `AdminNavBar` | `src/components/admin/AdminNavBar.tsx` | Client: sticky header, **মেনু** drawer `< lg`, desktop links `lg+`, **active** segment styling, Bengali labels |
| `DoctorNavBar` | `src/components/doctor/DoctorNavBar.tsx` | Same pattern for doctor portal |
| `ResponsivePanelCard` | `src/components/panel/ResponsivePanelCard.tsx` | Optional card shell (available for future screens) |
| `PanelEmptyState` | `src/components/panel/PanelEmptyState.tsx` | Optional empty state wrapper |

`AdminNav` remains a **server** component: loads notice + role, renders `AdminNavBar` with `showSettingsLink`.

`DoctorLeadsNav` is now a thin **client** wrapper around `DoctorNavBar`.

Existing **`LeadPriorityBadge`** / **`LeadStatusBadge`** unchanged.

## Mobile vs desktop behavior

- **Navigation:** Below **`lg` (`1024px`)**, admin/doctor use a **right-hand drawer** (overlay + scroll lock). **`lg+`** shows wrapped horizontal links. Drawer closes via backdrop, ×, or **navigation link tap** (no `setState` in `useEffect` on pathname — satisfies `react-hooks/set-state-in-effect`).
- **Lead / doctor lists:** Primary breakpoint for **table vs cards** aligned to **`lg`** where updated (admin requests, dashboard recent table, doctors list, notifications). Doctor leads was already `lg`.
- **Touch targets:** Primary actions generally **`min-h-[44px]`–`min-h-[52px]`**, `touch-manipulation` preserved where already present or added.

## Changed files (high level)

- `src/components/admin/AdminNav.tsx` — composes `AdminNavBar`
- `src/components/admin/AdminNavBar.tsx` — **new**
- `src/components/doctor/DoctorLeadsNav.tsx` — uses `DoctorNavBar`
- `src/components/doctor/DoctorNavBar.tsx` — **new**
- `src/components/panel/ResponsivePanelCard.tsx`, `PanelEmptyState.tsx` — **new**
- `src/app/admin/page.tsx` — BN summary + recent section; **`lg`** table/cards; richer mobile cards; empty state links to `/request`
- `src/app/admin/requests/page.tsx` — **`lg`** breakpoint; desktop phone column: **কল** + **WhatsApp**; mobile: call + WhatsApp row + **বিস্তারিত দেখুন**; safe-area padding
- `src/app/admin/leads/[id]/page.tsx` — larger contact buttons; safe-area padding on `main`
- `src/app/admin/doctors/page.tsx` — **`lg`** table/cards; safe-area padding; new-doctor CTA touch sizing
- `src/app/admin/doctor-applications/page.tsx` — stacked filter form on mobile; full-width selects/buttons; primary **বিস্তারিত দেখুন** button on cards
- `src/app/admin/notifications/page.tsx` — BN titles; **`lg`** table/cards; mobile lead link touch-friendly
- `src/app/admin/reports/page.tsx` — safe-area padding on `main`
- `src/app/admin/settings/page.tsx` — bottom safe-area padding on shell
- `src/app/doctor/page.tsx` — stat grid **`lg:grid-cols-3`** before `xl:grid-cols-6`
- `src/app/doctor/leads/page.tsx` — safe-area padding; **বিস্তারিত দেখুন** copy
- `src/app/doctor/leads/[id]/page.tsx` — action row **column stack on mobile**, larger **কল করুন** / **WhatsApp করুন**

## Hydration / lint notes

- Nav drawers use **`useState` + `useEffect`** only for **body scroll lock** when open — no `Date.now` / `Math.random` in JSX.
- Closing drawer on navigation uses **`onClick` on `<Link>`** inside the drawer, not an effect on `pathname`.

## Mobile-risky Tailwind review (sample)

- **`min-w-[960px]`–`min-w-[980px]`** on tables: kept **inside** `overflow-x-auto` wrappers shown **only at `lg+`** so phones/tablets don’t rely on them.
- **`whitespace-nowrap`** on date cells: limited to **desktop tables**; mobile cards use wrapping / `break-words`.
- **`fixed`** on drawers: intentional overlay; backdrop closes menu.

## Test command results

```bash
npm run lint    # pass
npm run typecheck  # pass
npm run build   # pass (Next.js 16.2.4; middleware deprecation notice only)
```

## Remaining limitations

- **Admin lead filters** (`AdminLeadsFilterForm`) not redesigned — still usable but dense on small screens.
- **Sub-pages** (e.g. `/admin/doctor-applications/[id]`, `/admin/doctors/new`, edit forms) were **not** individually restyled beyond inheriting the new nav.
- **`ResponsivePanelCard` / `PanelEmptyState`** are available but **not yet wired** into every screen (optional incremental adoption).
- **Logged-out** admin/doctor login pages unchanged except any shared globals.

## Manual QA checklist

- [ ] `< lg`: **মেনু** opens drawer; links work; backdrop closes; **active** route styled.
- [ ] `≥ lg`: horizontal nav; no drawer button.
- [ ] `/admin/requests` & `/doctor/leads`: cards &lt; `lg`, table ≥ `lg`; **newest order unchanged**.
- [ ] Admin requests mobile: **কল করুন**, **WhatsApp**, **বিস্তারিত দেখুন**.
- [ ] `/doctor/leads/[id]`: single-column actions on narrow phone; **কল করুন** / **WhatsApp করুন** readable.
- [ ] Safe areas: scroll to bottom on iOS — content not hidden behind home indicator.
