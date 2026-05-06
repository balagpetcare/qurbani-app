# Lead form hydration mismatch fix (2026-05-06)

## Root cause

`LeadForm` kept `areas` in client-only state (`useState([])`) and loaded them in `useEffect`. On the server, `SearchableAreaSelect` and the submit button derived `disabled` from `areas.length === 0`, but the server HTML and the client’s first hydrated pass could disagree with how/when that gating was applied (empty list vs deferred client-only updates). The select also combined `disabled={disabled || areas.length === 0}`, duplicating rules and coupling the child to loading shape.

Together this produced a mismatch: server markup treated controls as not disabled while the client’s first render marked them `disabled`.

## Changed files

- `src/lib/landing-public-data.ts` — `LandingAreaChip` now includes `id`; `getLandingAreas()` selects `id` and uses the same ordering as `/api/areas` (`sortOrder`, then `name`).
- `src/app/page.tsx` — passes `initialAreas={areasFromDb}` into `LeadForm` so SSR and hydration share the same area list when the DB read succeeds.
- `src/components/landing/LeadForm.tsx` — `initialAreas` seeds `useState`; gating uses `useSyncExternalStore` so “mounted” is `false` during SSR and hydration and `true` after attach (no `setState` in `useEffect`); explicit `areaFieldDisabled` / `submitDisabled` booleans passed to children.
- `src/components/forms/SearchableAreaSelect.tsx` — `disabled` is only `Boolean(disabled)` from props; parent owns loading/unavailable rules.

## Fix summary

1. **Deterministic areas on first paint:** the home page already loads areas for the coverage section; the same payload now seeds the form so the server and the first client render see identical `areas` when Prisma succeeds.
2. **Stable gating when areas are still empty:** `useSyncExternalStore(() => () => {}, () => true, () => false)` yields `mounted === false` for SSR and for the hydration pass, and `true` afterward. While `!mounted && areas.length === 0`, area/disabled gating is deferred so SSR and hydration markup match; after hydration, empty lists disable the field and submit as before.
3. **Select component:** removed `areas.length === 0` from the native `disabled` expression so the parent passes a single boolean; `useId()`-based `id` / `aria-controls` unchanged.

Invalid HTML nesting was checked: `LeadForm` uses `<fieldset>` → `<div>` → `SearchableAreaSelect` (a `<div>` tree), which is valid.

## Commands run and results

From repo root, in order:

| Command | Result |
|--------|--------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass (`tsc --noEmit`) |
| `npm run build` | Pass (Next.js 16.2.4 / Turbopack) |

Mount detection uses `useSyncExternalStore` (with a server snapshot) instead of `useEffect` + `setState`, which avoids `react-hooks/set-state-in-effect` while preserving SSR/hydration alignment.
