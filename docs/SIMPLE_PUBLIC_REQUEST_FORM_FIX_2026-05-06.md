# Simple public request form — landing split (2026-05-06)

## Old problem

- The full **multi-section** lead form lived **inline on `/`**, which felt heavy on mobile and in emergencies.
- Repeated contact blocks and many optional clinical fields slowed submission.
- Deep linking used `#lead-form`, which did not match a dedicated “request” URL.

## New public route

- **`/request`** — dedicated, mobile-first page with the **simplified** customer form (`SimpleRequestForm`).
- **`/`** — no longer renders the full form; hero / trust / sticky CTAs point to **`/request`** for online requests.
- **`LANDING_LEAD_FORM_HASH`** in `landing-contact.ts` now aliases **`LANDING_REQUEST_PATH`** (`"/request"`) so existing internal links keep working.

## Fields kept (customer-facing on `/request`)

| Label (BN) | Maps to API / DB |
|------------|------------------|
| আপনার নাম | `customerName` |
| মোবাইল নম্বর | `phone` |
| বিকল্প WhatsApp / ফোন (optional) | `whatsapp` |
| সেবার এলাকা | `areaId` |
| পশুর ধরন (required) | `animalKind`; if `OTHER`, `animalTypeOther` |
| কী সমস্যা হয়েছে? | `serviceRequirement` (required by API) |
| জরুরি অনুরোধ | `priority` (`NORMAL` / `URGENT` / `EMERGENCY`), gated by admin setting |
| ঠিকানা / পরিচিত স্থান (optional) | `address` |
| ছবি / ভিডিওর লিংক (optional) | `mediaUrls` (URLs only, same as before) |

Quick **কল করুন** / **WhatsApp করুন** actions remain at the top of the request page for emergencies.

## Fields removed / hidden from the public form (defaults)

These are **not** shown on `/request`; the API still accepts them as optional and stores **null/undefined** when omitted:

- `preferredContact`, `googleMapUrl`, `preferredTime`
- `animalCount`, `approxAgeText`, `approxWeightKg`
- `problemCategory`, `problemDuration`, `eatingStatus`, `feverSuspected`, `bellyBloated`, `canWalk`, `problemDetails`
- Separate long **service requirement** vs **problem details** split — merged into one **problem summary** mapped to **`serviceRequirement`**
- Extra **message** field — omitted (admins still see full `serviceRequirement` text)

UTM and `landingPath` are still sent when present (`landingPath` is typically `/request`).

## Changed files

| File | Change |
|------|--------|
| `src/components/landing/landing-contact.ts` | `LANDING_REQUEST_PATH`, hash alias → `/request` |
| `src/components/landing/SimpleRequestForm.tsx` | **New** simplified client form |
| `src/app/request/page.tsx` | **New** public page + analytics + header |
| `src/app/page.tsx` | Removed embedded `LeadForm` |
| `src/components/landing/HeroSection.tsx` | CTAs: কল / WhatsApp / জরুরি অনুরোধ → `/request` |
| `src/components/landing/TrustSection.tsx` | Same CTA pattern + copy tweak |
| `src/components/landing/StickyLandingCta.tsx` | Link to `/request`; short third label |
| `src/components/landing/LeadForm.tsx` | **Removed** (replaced by `SimpleRequestForm`) |

Other sections (`VideoAdviceSection`, `ProblemCategoryCardsSection`, `DoctorPreviewSection`) still import `LANDING_LEAD_FORM_HASH`; that constant now resolves to **`/request`**.

## Backend compatibility

- **`POST /api/leads`** unchanged: still requires `customerName`, `phone`, `areaId`, `serviceRequirement`.
- **`parsePublicLeadIntake`** unchanged: validates `animalKind` + `animalTypeOther` when `OTHER`.
- No Prisma schema changes.
- Lead workflow (status, assignment, doctor flows) unchanged.

## Hydration / SSR notes

- `/request` loads **areas on the server** and passes `initialAreas` into the client form — **no** client-only area list on first paint, **no** `Date.now` / `Math.random` in UI.
- Submit disabled when `initialAreas.length === 0` (same empty state on server and client).

## Test results

Commands (2026-05-06, local):

- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm run build` — pass (Next.js 16.2.4; middleware deprecation notice only)

Route manifest includes **`ƒ /request`**.

## Manual QA checklist

1. **`/`** — কল, WhatsApp, “জরুরি অনুরোধ করুন” visible; third opens **`/request`** (when form enabled in settings).
2. **`/request`** — short form; submit creates lead; redirects to **`/thank-you?leadId=…`**.
3. **`/admin/requests`** — new lead appears; list still ordered by **priority desc**, **createdAt desc** (newest among same priority).
4. **Mobile** — no horizontal overflow; targets ≥ ~52px height on primary controls.
5. **Settings off** — `leads.form_enabled` false → `/request` shows “বন্ধ” message + call/WhatsApp only (`POST /api/leads` still returns 403 as before).
