# Quarbani 2026 — Next stage QA report

**Document:** `docs/Q26_NEXT_STAGE_QA_REPORT.md`  
**Command:** Q26-CMD-13  
**Date:** 2026-05-05  
**Scope:** Regression and flow verification for work delivered in **Q26-CMD-02 through Q26-CMD-12** (no large new features in this pass).

---

## 1. Verification methods

| Layer | What ran |
|--------|-----------|
| **Schema / client** | `npx prisma validate`, `npx prisma generate` |
| **Static analysis** | `npm run lint`, `npm run typecheck` |
| **Production build** | `npm run build` |
| **Code trace** | Read paths for auth, `normalizeBangladeshPhone`, `buildDoctorLeadWhere`, lead APIs, admin detail case report, public showcase query |

End-to-end clicks against a live database were **not** executed in this environment; flows below are marked **Pass (code+build)** when implementation clearly supports the scenario, or **Manual** where a human must confirm in staging/production.

---

## 2. Flow matrix (20 scenarios)

| # | Flow | Result | Evidence / notes |
|---|------|--------|-------------------|
| 1 | Public landing loads | **Pass (code+build)** | `src/app/page.tsx`, landing sections; build includes `/`. |
| 2 | Customer submits normal lead | **Pass (code+build)** | `POST /api/leads` creates lead, `NEW_LEAD` notification (`src/app/api/leads/route.ts`). |
| 3 | Customer submits emergency lead | **Pass (code+build)** | `LeadPriority.EMERGENCY` → `EMERGENCY_LEAD` notification + copy (`api/leads/route.ts`). |
| 4 | Phone with/without +88 | **Pass (code+build)** | `normalizeBangladeshPhone` accepts `880…`, `01…`, `1…` (`src/lib/phone.ts`). **Manual:** paste odd spacing. |
| 5 | Area selection works | **Pass (code+build)** | `GET /api/areas`; `LeadForm` requires `areaId` (`api/leads/route.ts` validates active area). |
| 6 | Lead appears newest in admin list | **Pass (code+build)** | `/admin/requests` uses `orderBy: [{ priority: "desc" }, { createdAt: "desc" }]` — emergencies first, then newest. |
| 7 | Admin views lead detail | **Pass (code+build)** | `src/app/admin/leads/[id]/page.tsx`. |
| 8 | Admin creates/edits doctor | **Manual** | UI at `/admin/doctors/new`, `/admin/doctors/[id]/edit` + APIs; verify with seeded admin. |
| 9 | Admin assigns doctor area coverage | **Manual** | Doctor edit + `PATCH` areas API; confirm `DoctorArea` rows in DB. |
| 10 | Doctor logs in | **Pass (code+build)** | `/doctor/login`, `POST /api/doctor/login`, cookie + middleware. |
| 11 | Doctor sees only allowed leads | **Pass (code+build)** | `buildDoctorLeadWhere` in `src/lib/doctor-lead-access.ts`. |
| 12 | Doctor cannot open unauthorized lead | **Pass (code+build)** | `doctorCanAccessLead` + redirect `?restricted=1` on list/detail. |
| 13 | Doctor accepts lead | **Pass (code+build)** | `POST /api/doctor/leads/[id]/accept` + notification hook. |
| 14 | Doctor completes case | **Pass (code+build)** | `POST /api/doctor/leads/[id]/complete` upserts `LeadCaseReport`, sets `COMPLETED`. |
| 15 | Completed case report in admin | **Pass (code+build)** | Admin lead detail renders `caseReport` block when present. |
| 16 | Public showcase hides private data | **Pass (code+build)** | `getPublicShowcaseCases` selects only title, summary, area label, date — no name/phone (`src/lib/landing-public-data.ts`). UI states anonymity (`CaseShowcaseSection`). Doctor must not put PII in showcase text (process). |
| 17 | Doctor application submits | **Pass (code+build)** | `POST /api/doctor-applications` + `DoctorApplicationForm`. |
| 18 | Admin reviews doctor application | **Manual** | `/admin/doctor-applications`, PATCH status, optional convert. |
| 19 | Video advice section works | **Pass (code+build)** | `VideoAdviceSection` external YouTube search links + form CTA. |
| 20 | Mobile sticky CTA works | **Pass (code+build)** | `StickyLandingCta` on `/` (`md:hidden`), safe-area padding. **Manual:** real device notch/home bar. |

**Summary:** 0 failed in automated stack; **Manual** rows need one staging pass with real DB + credentials.

---

## 3. Fixes applied in CMD-13

| Item | Change |
|------|--------|
| Showcase robustness | `getPublicShowcaseCases` uses optional chaining on `selectedArea` when building `areaLabel` (`landing-public-data.ts`). |
| Video section mobile | `VideoAdviceSection`: horizontal safe-area padding, inner `px-2`, larger tap target + `touch-manipulation` on external links. |

---

## 4. Remaining known issues / gaps

| Issue | Severity | Note |
|-------|----------|------|
| **Notification delivery** | Medium | WhatsApp/SMS rows are queued only; no provider sends messages yet. |
| **PWA icons** | Low | Manifest uses `/icon.svg`; many installers prefer **192×512 PNG** maskable icons (see `docs/Q26_ANDROID_CONVERSION_PLAN.md`). |
| **Offline shell** | Low | `/offline` page exists; no service worker — no automatic offline navigation shell. |
| **Showcase PII** | Process | Public API does not expose customer fields; doctors could still type names/phones into showcase summary — train reviewers + optional server-side heuristics later. |
| **Next.js middleware** | Info | Build warns about middleware → proxy migration (framework roadmap). |
| **Docs vs code: admin role** | Info | `Q26_NEXT_STAGE_MASTER_PLAN.md` §1.1 says admin-only portal; **`middleware` + `requireAdminFromRequest` allow `STAFF`** as well — guides below reflect actual code. |

---

## 5. Commands run (results)

| Command | Result |
|---------|--------|
| `npx prisma validate` | Success |
| `npx prisma generate` | Success |
| `npm run lint` | Success |
| `npm run typecheck` | Success |
| `npm run build` | Success |

---

## 6. Deployment notes

1. **Environment:** Set `DATABASE_URL`, `SESSION_SECRET`, seed vars as in `.env.example`. For correct OG/PWA absolute URLs, set **`NEXT_PUBLIC_APP_URL`** (HTTPS, no trailing slash).
2. **Migrations:** Run `npx prisma migrate deploy` (or your CI equivalent) before first traffic.
3. **Seed:** Run `npm run db:seed` (or project script) to create admin + areas; change seeded password after login.
4. **HTTPS:** Required for secure cookies in production; test admin/doctor login only on HTTPS hosts.
5. **Support line:** Public landing phone/WhatsApp use `LANDING_SUPPORT_DIGITS` in `src/components/landing/constants.ts` — update before go-live.
6. **Build:** `next build` emits middleware deprecation notice only; no build failure.

---

## 7. Recommended next step

**Q26-CMD-14** (or next planned item in your tracker): production hardening — rate limits on public `POST` routes, structured logging/monitoring, real WhatsApp/SMS provider wiring, and PNG PWA icons after design sign-off.
