# Homepage, public doctor privacy, and home visit fee — 2026-05-06

## Summary

- Rebuilt the public homepage as a **mobile-first, wide-layout** landing page (no more 430px-only “phone frame” on desktop).
- Added **admin-managed home visit fee range** on the `User` row (`homeVisitFeeMin`, `homeVisitFeeMax`, `feeNote`) with API validation and admin create/edit forms.
- Enforced **public privacy**: doctor **phone, WhatsApp, and email** are never selected for public listings or the homepage; **`notes` are no longer used** as public copy (internal-only in admin).
- Introduced a **whitelist mapper** `toPublicDoctorCard` in `src/lib/public-doctor.ts` for all public doctor payloads.

## Changed files (primary)

| Area | Files |
|------|--------|
| Schema / DB | `prisma/schema.prisma`, `prisma/migrations/20260506180000_doctor_home_visit_fee/migration.sql` |
| Public doctor data | `src/lib/public-doctor.ts`, `src/lib/landing-public-data.ts`, `src/lib/doctor-fee-input.ts` |
| Admin API | `src/app/api/admin/doctors/route.ts`, `src/app/api/admin/doctors/[id]/route.ts` |
| Admin UI | `src/components/admin/DoctorForm.tsx`, `src/components/admin/DoctorEditForm.tsx`, `src/app/admin/(shell)/doctors/[id]/edit/page.tsx` |
| Convert application | `src/app/api/admin/doctor-applications/[id]/convert/route.ts` (sets `homeVisitFeeMin` from `expectedVisitCharge` when present) |
| Homepage / landing | `src/app/page.tsx`, `src/components/landing/HeroSection.tsx`, `LandingQuickAreaSection.tsx`, `LandingBenefitsSection.tsx`, `LandingFinalCtaSection.tsx`, `HowItWorksSection.tsx`, `FaqSection.tsx`, `DoctorPreviewSection.tsx` |
| Public doctors | `src/app/doctors/page.tsx`, `src/app/doctors/[id]/page.tsx`, `src/components/ui/AppDoctorCard.tsx` |
| Request flow | `src/app/request/page.tsx`, `src/components/landing/SimpleRequestForm.tsx` (`?area=` prefill) |
| Shell / theme | `src/components/ui/AppShell.tsx` (`contentMax="wide"`), `src/app/globals.css` (`--q-shell-wide`) |

## Data model

On `User`:

- `homeVisitFeeMin Int?` — minimum home visit fee (BDT, whole taka).
- `homeVisitFeeMax Int?` — maximum home visit fee (BDT, whole taka).
- `feeNote String?` — optional public note shown under the fee line on cards.

**Validation (admin API):**

- If provided, min/max must be **positive integers** (or `null` to clear on PATCH).
- **Max requires min** when max is set.
- **max ≥ min** when both are set.

## Public vs private doctor fields

**Public (whitelist via `toPublicDoctorCard` + explicit Prisma `select`):**

- Name, profile photo URL, qualification, short bio, experience summary (as blurb), areas, availability code → label, optional `availableTimeText`, completed-case counts for display, fee min/max/note, fee display string.

**Never exposed on public homepage, `/doctors`, or `/doctors/[id]`:**

- `phone`, `whatsapp`, `email`, `passwordHash`, `notes`, notify flags, internal admin-only data.

**Admin / internal:**

- Full contact fields and notes remain on admin doctor APIs and edit UI.

## How admin sets doctor fee

1. **New doctor:** `/admin/doctors/new` — “হোম ভিজিট ফি — সর্বনিম্ন/সর্বোচ্চ (৳)” and optional “ফি সম্পর্কিত নোট (পাবলিক)”.
2. **Edit doctor:** `/admin/doctors/[id]/edit` — same fields; leave min/max empty and save to **clear** (stored as `null`).

Fees appear on public cards as Bangla-formatted lines, e.g. `হোম কল ভিজিট: ৳১,৫০০–৳৩,৫০০`, per `formatHomeVisitFeeLineBn`.

## Test checklist

- [ ] `npx prisma migrate deploy` (or `prisma migrate dev`) applies `20260506180000_doctor_home_visit_fee`.
- [ ] Homepage at **360px / 390px**: hero, area chips, benefits grid, doctor cards, no horizontal scroll.
- [ ] Desktop: content uses **wide** shell (not stuck at 430px).
- [ ] Public doctor cards show **fee line**; **no** doctor phone/email/WhatsApp.
- [ ] `/request?area=<id>` pre-selects area when valid.
- [ ] Admin create/edit doctor: fee validation (max without min, max &lt; min) returns 400 with clear error.
- [ ] `npm run lint`, `npm run typecheck`, `npx prisma validate`, `npx prisma generate`, `npm run build` succeed.

## Commands run (implementation)

| Command | Result |
|---------|--------|
| `npx prisma validate` | OK |
| `npx prisma generate` | OK |
| `npm run lint` | OK |
| `npm run typecheck` | OK (after fixing `getPublicDoctorById` import on `doctors/[id]`) |
| `npm run build` | OK |

**Note:** Database migration was **authored** in-repo; apply it in each environment with your usual Prisma migrate command against `DATABASE_URL`.
