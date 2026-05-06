# Landing page — Bengali copy & mobile UI/UX refactor (2026-05-06)

## Scope

Public home route (`/`) and landing-only components under `src/components/landing/`. No backend, Prisma, auth, admin/doctor apps, or lead workflow changes. `src/lib/public-doctor.ts` was **not** modified (shared with `/doctors`); default experience blurb there remains unchanged.

## Changed files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Default hero subtitle: `এরিয়া-ভিত্তিক` → `এলাকাভিত্তিক` |
| `src/components/landing/landing-button-classes.ts` | **New** — landing-only primary/secondary/sticky/dark CTA class strings |
| `src/components/landing/HeroSection.tsx` | Copy fixes, shared button classes, helpline label |
| `src/components/landing/LandingMobileStickyCta.tsx` | Two-column sticky CTA (`grid-cols-2`), equal width, `min-h-[44px]` |
| `src/components/landing/LandingQuickAreaSection.tsx` | Area copy, pill chips, CTA buttons |
| `src/components/landing/LandingFinalCtaSection.tsx` | Copy, aligned primary label with hero, button classes |
| `src/components/landing/LandingBenefitsSection.tsx` | Benefit copy, card padding/rounding |
| `src/components/landing/HowItWorksSection.tsx` | Step 2 title/body, step circle touch size, card radius |
| `src/components/landing/CaseShowcaseSection.tsx` | Section title, placeholder summary wording, card radius |
| `src/components/landing/FaqSection.tsx` | Answer copy, larger FAQ touch targets |
| `src/components/landing/DoctorPreviewSection.tsx` | Card padding, typography, shared CTA classes, `min-w-0` / `break-words` |

## Exact text replacements (Part 1)

| Before | After |
|--------|--------|
| `ডাক্তারের হিসেবে যুক্ত হন` | `ডাক্তার হিসেবে যুক্ত হন` |
| `হেল্পলাইনে কল` | `হেল্পলাইনে কল করুন` |
| `উপলব্ধ ডাক্তার দলকে` | `সংশ্লিষ্ট এলাকার ডাক্তারদের` |
| `মাঠ পরামর্শ` (in landing FAQ & benefits) | `সরাসরি চিকিৎসা ও পরামর্শ` / `সরাসরি চিকিৎসা, পরামর্শ` (see benefits for natural phrasing) |
| `এরিয়া অনুযায়ী ডাক্তার` | `এলাকাভিত্তিক ডাক্তার` |
| `ডাক্তার লিড দেখেন ও গ্রহণ করতে পারেন` | `ডাক্তাররা রিকোয়েস্ট দেখতে ও গ্রহণ করতে পারবেন` |
| `সম্পন্ন কেস — উদাহরণ (বেনামী)` | `সফল চিকিৎসার উদাহরণ (পরিচয় গোপন রাখা হয়েছে)` |
| `সম্পূর্ণ অনুরোধ ফর্ম` | `বিস্তারিত ফর্ম পূরণ করুন` |

### Additional light copy (same surface)

- Hero / final CTA / FAQ: `ওয়ার্কফ্লোতে` → `প্রক্রিয়ায়`
- How it works step 2 title: `উপলব্ধ ডাক্তার দেখেন` → `ডাক্তার দলের সমন্বয়`
- Case showcase placeholder: `মাঠ পরিদর্শন ও পরামর্শে` → `সরাসরি চিকিৎসা ও পরামর্শে`
- Benefits first item: natural phrasing with `সরাসরি চিকিৎসা, পরামর্শ ও প্রাথমিক সেবা`
- `page.tsx` default hero: `এলাকাভিত্তিক ডাক্তার`
- `LandingFinalCtaSection` primary button label aligned with hero: `চিকিৎসা অনুরোধ করুন`

## UI/UX fixes

- **Sticky mobile CTA:** `grid grid-cols-2` when both actions enabled; `gap-2` / `sm:gap-3`; `min-h-[44px]`; `rounded-xl`; `text-sm` → `sm:text-base`; `break-words`; single column flex when only one CTA.
- **Area badges:** `flex-wrap`, `gap-2`, horizontal margin via container; pills `rounded-full`, `px-4 py-2`, `min-h-[44px]`, clearer border/ring.
- **Landing buttons:** Shared `rounded-2xl`, `px-4 py-3`, `font-semibold`, centered; gold primary vs outline secondary; dark-section variants for final CTA.
- **Doctor cards:** `p-5`, `rounded-2xl`/`sm:rounded-3xl`, `leading-relaxed`, CTA row `gap-2`/`sm:gap-3`, overflow guards.
- **FAQ:** Summary row `min-h-[44px]`, extra padding; details full-width `min-w-0`.

## Privacy

- `DoctorPreviewSection` still shows only whitelisted public fields (no doctor phone/WhatsApp).
- Hero/footer messaging unchanged: personal doctor numbers are not shown on the public landing.

## Mobile QA notes (manual)

- Sticky bar: two equal columns on typical 360–430px widths; text wraps without forcing horizontal scroll.
- Hero banner: unchanged responsive image constraints.
- Bottom padding on `AppShell` main (`!pb-[calc(9.25rem+…)]`) still clears sticky CTA + bottom nav.
- Recommended spot-check: 360 / 390 / 430 / tablet / desktop in devtools.

## Validation

```text
npm run lint      — pass
npm run typecheck — pass
npm run build     — pass (Next.js 16.2.4)
```

Build emitted existing warning: middleware → proxy deprecation (unchanged by this work).

## Known follow-up

- API-backed doctor cards without custom summary still use the default blurb in `src/lib/public-doctor.ts` (`মাঠ পরামর্শ…`), which is shared with `/doctors` and was left untouched for scope.
