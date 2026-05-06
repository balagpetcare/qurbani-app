# Landing page mobile hero — implementation report (2026-05-06)

## Summary

- Public home (`/`) uses a **large top banner** (`public/images/qurbani-2026-hero.png`) with **Next.js `Image`**, mint/white shell, **green + gold CTAs**, and **rounded premium cards**.
- **No `AppHeader`** / admin-style top bar on the landing page; **অ্যাডমিন** is a discreet **footer** link only.
- **No doctor phone/WhatsApp** on the landing; helpline uses **site settings** only. Doctor cards use **`PublicDoctorCard`** (whitelisted fields).
- **Final polish (this pass):** removed the **duplicate large H1** under the banner (banner carries branding); **SEO `h1` is `sr-only`**. Sticky mobile CTAs are **stacked full-width** so labels are not squeezed at 360px. **Overflow guards** (`min-w-0`, `overflow-x-clip` on shell), **taller hero image** on small viewports, **footer breathing room**, **rounded-3xl** cards where it fits the emergency-service look.

## Asset

| File | Purpose |
|------|---------|
| `public/images/qurbani-2026-hero.png` | Hero banner |

## Final changed files (cumulative + QA pass)

| File | Role |
|------|------|
| `src/app/page.tsx` | Landing layout: no header; banner; `HeroSection` with `pageTitleSeo`; sections; footer; `AppShell` landing + mint |
| `src/app/globals.css` | `--q-landing-canvas`, `--q-landing-inner-max` |
| `src/components/ui/AppShell.tsx` | `contentMax: "landing"`, `mainClassName`, shell `min-w-0` / `max-w-full` / `overflow-x-clip` |
| `src/components/landing/LandingHeroBanner.tsx` | Responsive hero image, `object-contain`, rounded bottom, overflow-safe |
| `src/components/landing/LandingMobileStickyCta.tsx` | Mobile-only stacked CTAs, 48px min height |
| `src/components/landing/HeroSection.tsx` | `sr-only` h1 + visible subtitle lead; gold/green CTAs; platform helpline |
| `src/components/landing/LandingQuickAreaSection.tsx` | Mint block; wrapping chips; `min-w-0` |
| `src/components/landing/LandingBenefitsSection.tsx` | `rounded-3xl` cards; `min-w-0` container |
| `src/components/landing/DoctorPreviewSection.tsx` | `rounded-3xl` cards; no contact fields |
| `src/components/landing/HowItWorksSection.tsx` | Responsive grid; `rounded-3xl` step cards |
| `src/components/landing/CaseShowcaseSection.tsx` | Responsive grid; `rounded-3xl` case cards |
| `src/components/landing/FaqSection.tsx` | Readable FAQ; `min-w-0` on rows |
| `src/components/landing/LandingFinalCtaSection.tsx` | Green CTA block |

## CTA & navigation routes (verified against `src/app`)

| UI element | Route / action | Notes |
|------------|----------------|--------|
| Primary gold “চিকিৎসা অনুরোধ করুন” (hero, sticky, final CTA, doctor cards) | `/request` | `LANDING_REQUEST_PATH` |
| Secondary “ডাক্তারের হিসেবে যুক্ত হন” | `/doctor/apply` | Only if `applicationsEnabled` |
| “ডাক্তার দেখুন”, area “ডাক্তার তালিকা” | `/doctors` | Public directory |
| Doctor card “প্রোফাইল দেখুন” | `/doctors/[id]` | Public profile (no phone) |
| Area chips | `/request?area={id}` | Pre-fills area on request form |
| Footer “অ্যাডমিন” | `/admin` | Staff entry |
| Footer doctor apply / track | `/doctor/apply`, `/track` | |
| Helpline call / WhatsApp | `tel:…`, `https://wa.me/…` | From site settings, not doctor PII |
| Bottom nav (customer) | `/`, `/doctors`, `/request`, `tel:…` | `customerBottomNav` |

No invented paths; all exist in the App Router tree.

## Public doctor privacy

- Landing + `DoctorPreviewSection` use **only** public-safe doctor fields from `getDoctorPreviews` / `PublicDoctorCard`.
- **Doctor `phone` / `whatsapp` / `email`** are **not** selected for public listings.

## Responsive QA notes (code-level; manual confirm in browser)

| Viewport | Checks addressed in code |
|----------|----------------------------|
| **360 / 390 / 430px** | `overflow-x-clip` on shell; `min-w-0` on flex children; banner `max-w-full` + `object-contain`; hero **no duplicate visual H1**; sticky CTAs **column + full width** (no squeeze); area `flex-wrap` + `break-words`; cards default **single column** until `sm`/`md`/`lg` breakpoints |
| **Tablet** | Content centered via `AppShell` + `--q-landing-inner-max`; benefits/how-it-works/cases use **2 columns** where specified |
| **Desktop** | Inner column capped at **~960px**; hero image **not stretched** (`object-contain`, max-height caps) |

## Commands & results (latest run)

| Command | Result |
|---------|--------|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |

## Remaining manual checks (device / real content)

1. **Hero PNG aspect ratio:** If the asset is very tall/wide, tweak `max-h-[min(56vw,320px)]` / `md:max-h-[…]` in `LandingHeroBanner.tsx` for pixel-perfect balance.
2. **Sticky CTA vs footer:** Scroll to the very bottom on a **small phone** and confirm the last lines are not hidden behind the sticky bar + bottom nav (main uses extra bottom padding for this).
3. **Site settings:** Confirm helpline digits in admin settings match production expectations.

## Related plan doc

- `docs/LANDING_PAGE_MOBILE_HERO_FIX_PLAN_2026-05-06.md`
