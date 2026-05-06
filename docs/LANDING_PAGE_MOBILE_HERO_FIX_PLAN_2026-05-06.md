# Landing page mobile hero & banner — implementation plan (2026-05-06)

## Scope (strict)

- **In scope:** Public landing route UI only (`/`): layout, header/hero, landing-specific components, shared shell/header usage on that route, and **optional** token/CSS tweaks in `globals.css` if they only affect visual polish (no behavior change).
- **Out of scope:** Backend, Prisma, migrations, auth, admin, doctor workflow, lead APIs, site settings loaders, analytics wiring (keep `LandingAnalyticsScripts` as-is unless purely moved in the tree).

## Current route and entry file

- **Route:** `/` (App Router).
- **File:** `src/app/page.tsx` — loads `getLandingPublicPayloadSafe`, `getLandingAreas`, `getDoctorPreviews`, `getPublicShowcaseCases`; renders `AppShell` + sections below.

## Components and files used by the landing page (inventory)

### Page-level shell & chrome

| Piece | File | Role on landing today |
|--------|------|------------------------|
| Shell | `src/components/ui/AppShell.tsx` | Wraps content; optional `header`, `bottomNav`, `contentMax="wide"`. |
| Top bar | `src/components/ui/AppHeader.tsx` | **Gradient sticky bar** with title, subtitle, and **অ্যাডমিন** link (`page.tsx` `actions`). |
| Bottom nav | `src/components/ui/BottomNav.tsx` | Customer nav via `customerBottomNav`. |
| Analytics | `src/components/landing/LandingAnalyticsScripts.tsx` | FB / GA scripts. |

### Landing sections (in render order)

| Section | File |
|---------|------|
| Hero (title, CTAs, helpline) | `src/components/landing/HeroSection.tsx` |
| Area chips + links | `src/components/landing/LandingQuickAreaSection.tsx` |
| Service benefits grid | `src/components/landing/LandingBenefitsSection.tsx` (uses `AppCard`) |
| Doctor preview cards | `src/components/landing/DoctorPreviewSection.tsx` |
| How it works | `src/components/landing/HowItWorksSection.tsx` |
| Success / showcase cases | `src/components/landing/CaseShowcaseSection.tsx` |
| FAQ | `src/components/landing/FaqSection.tsx` |
| Final CTA band | `src/components/landing/LandingFinalCtaSection.tsx` |

### Inline on `page.tsx`

- **Footer** block (links, site title, address, social) — not a separate component.
- **Early exits:** `PublicSiteDisabledMessage`, `MaintenanceModeMessage` from `src/components/landing/PublicSiteMessages.tsx`.

### Supporting (not always visible)

- `src/components/landing/landing-contact.ts` — tel/WhatsApp helpers used by `HeroSection` and footer-related patterns elsewhere.

### Global styles / tokens

- `src/app/globals.css` — `--q-primary`, `--q-accent-gold`, `--q-primary-soft`, `--q-shell-wide`, touch min height, etc.

### Banner asset (to confirm)

- **Expected:** A single Qurbani 2026 banner/logo image committed under `public/` (e.g. `public/images/qurbani-2026-banner.webp` or `.png`).
- **Current repo check:** `public/` today only lists generic SVGs + `manifest.webmanifest` — **the new banner file must be added or its final path confirmed** before implementation so code references the correct URL.

## Design goals (reference-aligned, mobile-first)

1. **Remove the admin-style top bar** from the public landing: no `AppHeader` with title/subtitle/অ্যাডমিন on `/`.
2. **Banner first:** The uploaded Qurbani 2026 image is the **first visual** at the top of the scrollable landing content (below any outer shell chrome if applicable).
3. **Mobile image quality:** No horizontal scroll; image scales with `max-width: 100%`; use `object-fit` / aspect handling so the banner is **legible and prominent** on narrow viewports (avoid a tiny strip or harsh center-crop unless the art direction requires it — prefer `object-contain` on a soft mint/white band or `object-cover` with controlled `max-height` and safe focal area).
4. **Section order preserved** after the banner + hero block:
   - Main emergency treatment CTA (primary request flow)
   - Area selection
   - Service benefits
   - Doctor/team
   - How it works
   - Success cases
   - FAQ
   - Final CTA
   - Footer
5. **Visual language:** Green, gold, white, soft mint — align section backgrounds and buttons with the banner (tweak gradients/spacing only; keep existing semantic structure).
6. **Touch UI:** Large rounded buttons (`--q-touch-min` / `rounded-2xl`), clear hierarchy; cards: rounded corners, light border + subtle shadow consistent with `AppCard` / existing patterns.

## Implementation plan (when approved)

### 1. Asset and path

- Add or locate the final banner file under `public/` (recommend `public/images/` for clarity).
- Prefer **WebP** or optimized **PNG**; document chosen filename in a one-line comment or in this doc’s appendix during implementation.
- If using `next/image`, ensure `next.config` allows local `/public` paths (default) and set explicit `width`/`height` or `fill` + aspect wrapper to avoid CLS.

### 2. Remove `AppHeader` from `/` only

- In `src/app/page.tsx`, **omit** the `header={...}` prop on `AppShell` (prop is optional).
- **অ্যাডমিন** entry: either remove from landing entirely (stakeholder choice) or move to **footer** as a discreet text link so the top no longer reads as an “admin app bar.”

### 3. New top banner component (recommended)

- Add something like `src/components/landing/LandingTopBanner.tsx` (name flexible) that:
  - Renders the image at **full width of the landing column** (`w-full`, `min-w-0`).
  - Uses `overflow-x-clip` on ancestors (already on `main` in `AppShell`) and avoids fixed widths that exceed the viewport.
  - Handles **safe area** if the image touches the top edge (optional `padding-top` env).
  - Optional: very subtle bottom border or gradient fade into the hero section so the transition matches the reference.

### 4. Layout integration with `AppShell` / `main` padding

- Today `main` has `px-4 pt-3` — the banner may need **edge-to-edge** width within the card:
  - Option A: Banner as first child with negative horizontal margin matching `main` padding (`-mx-4 sm:-mx-5`) and zero top padding on `main` for landing only (e.g. `pt-0` on home).
  - Option B: Small wrapper in `page.tsx` that resets padding for the banner row only.
- Verify **no horizontal scroll** at 360px and 390px after changes.

### 5. `HeroSection` adjustments (still no backend)

- Visually connect hero to banner: background gradient from **soft mint / white**; reduce duplicate “app title” feel since the bar is gone (headline/subcopy may stay; optional trim of eyebrow if redundant with artwork).
- Keep primary CTA (request), secondary (doctor apply), helpline row; ensure spacing reads as one **hero block** under the banner per reference.

### 6. Pass polish across sections (incremental)

- **LandingQuickAreaSection**, **LandingBenefitsSection**, **DoctorPreviewSection**, **HowItWorksSection**, **CaseShowcaseSection**, **FaqSection**, **LandingFinalCtaSection**, **footer**: unify border radius, shadow, and spacing scale; prioritize mobile stacking; avoid desktop-only multi-column as the only readable layout.
- Reuse `AppCard` / existing utilities; avoid new design system unless necessary.

### 7. Regression checks (manual)

- `/` with `publicSiteEnabled` and not `maintenanceMode`: full flow from top to footer.
- Small viewports: 360px, 390px, plus one tablet width.
- No overflow-x; tap targets ≥ 44px on primary actions.
- `PublicSiteDisabledMessage` / `MaintenanceModeMessage` unchanged.
- **Do not** alter other routes’ headers unless explicitly requested later.

## Risks / notes

- **Reference attachment:** This plan assumes a separate visual reference (banner artwork + layout). During implementation, compare spacing and hierarchy to that reference; adjust banner `object-fit` and max-height accordingly.
- **Lighthouse / CLS:** Set dimensions or reserve aspect ratio for the banner to limit layout shift.

## Completion criteria

- Landing `/` has **no** `AppHeader` admin-style bar.
- Qurbani 2026 banner is the **top** visual; sections below match the agreed order.
- Mobile-first appearance: strong banner presence, no horizontal scroll, polished CTAs and cards.
- No backend or workflow changes.

---

*Status: planning only — implementation deferred until approved.*
