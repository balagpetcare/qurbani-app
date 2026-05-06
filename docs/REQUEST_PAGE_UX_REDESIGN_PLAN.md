# Request page (`/request`) — UX redesign & implementation plan

**App:** Qurbani 2026 (Quarbani) public customer lead form  
**Route:** `http://localhost:3000/request`  
**Status:** Planning only — no implementation in the command that created this document  
**Date:** 2026-05-06  

---

## 1. Current architecture (code findings)

### 1.1 Route & layout

| Piece | Location | Role |
|--------|-----------|------|
| Page entry | `src/app/request/page.tsx` | Server component: gates public site (`publicSiteEnabled`, `maintenanceMode`), loads areas (`getLandingAreas`), resolves `?area=` prefill, renders shell + `SimpleRequestForm`. |
| Shell | `src/components/ui/AppShell.tsx` | `variant="customer"`, `header` = `AppHeader`, `bottomNav` = `BottomNav` with `customerBottomNav(lp.phoneCallDigits)`. |
| Header | `src/components/ui/AppHeader.tsx` | Sticky top; title **“চিকিৎসার অনুরোধ”**, subtitle = site title, back to `/`, action link to `/doctors`. |
| Bottom nav | `src/components/ui/BottomNav.tsx` + `src/lib/customer-nav.ts` | Home, Doctors, Request, Call (`tel:`). **≤639px:** `fixed` bottom, `z-40`. **≥640px:** `sticky` bottom inside shell. Safe-area padding on nav. |
| Main padding | `AppShell` | When `bottomNav` present, `<main>` gets `pb-app-nav` (see globals). |

### 1.2 Form implementation

| Piece | Location | Role |
|--------|-----------|------|
| Main UI | `src/components/landing/SimpleRequestForm.tsx` | Client-only form; **only consumer** of this component is `/request`. |
| Area picker | `src/components/forms/SearchableAreaSelect.tsx` | Combobox + hidden `areaId`; controlled via parent state on `/request`. |
| Submit API | `src/app/api/leads/route.ts` | `POST` validates name, phone, `areaId`, `serviceRequirement`; phone/whatsapp normalization; `parsePublicLeadIntake` for animal/priority/media; creates `Lead`; optional duplicate detection. |
| Intake parser | `src/lib/public-lead-intake.ts` | Parses `animalKind`, priority, media URLs; Bengali error for “OTHER” without description. |
| Success redirect | `SimpleRequestForm` → `router.push('/thank-you?leadId=…')` | Full-page thank-you: `src/app/thank-you/page.tsx` uses `AppSuccessState`, optional lead summary. |
| Contact links | `src/components/landing/landing-contact.ts` | `landingTelHref`, `landingWhatsAppHref` (+ fallback digits). |

### 1.3 CSS tokens relevant to overlap

- `src/app/globals.css`: `.pb-app-nav { padding-bottom: calc(6.25rem + env(safe-area-inset-bottom, 0px)); }` — main content clearance above bottom nav.
- Form section adds extra bottom padding: `pb-[max(5rem,env(safe-area-inset-bottom))]` on the outer `<section>` inside `SimpleRequestForm` (layers on top of `main`’s `pb-app-nav`).

### 1.4 Field mapping (current → API)

| UI field | Payload key | Server requirement |
|-----------|-------------|---------------------|
| Name | `customerName` | Required |
| Mobile | `phone` | Required; normalized BD mobile |
| WhatsApp alt | `whatsapp` | Optional |
| Area | `areaId` | Required; must be active area |
| Animal kind | `animalKind` | Select marked `required` in HTML |
| Other animal text | `animalTypeOther` | Required when kind is `OTHER` (parser + DB) |
| Problem | `problemSummary` → **`serviceRequirement`** | Required |
| Priority | `priority` | Default/normal; urgent/emergency gated by settings |
| Address | `address` | Optional |
| Media URLs | `mediaUrls` | Optional (lines → array) |
| UTM / path | from browser | `utm*`, `landingPath` |

---

## 2. UX & technical problems found

### 2.1 Validation & `noValidate`

- The form sets **`noValidate`** on `<form>`, which **disables native HTML5 constraint validation** on submit.
- **`required` attributes therefore do not block submit** in the browser; empty or incomplete data can be posted and only fails at the API (or slip through where the API allows optional DB fields — see §2.3).
- **Impact:** Low-tech users do not get immediate, field-local browser feedback; errors appear as a **single red banner** (`error` state) after a round trip, with **no inline messages**, **no red borders**, **no scroll/focus** to the first problem field.

### 2.2 Error presentation

- Client-side: one **`role="alert"`** block for any failure (network or API).
- Server-side mapping in `SimpleRequestForm` translates several English `error` strings to Bengali; gaps remain (e.g. **`Invalid or inactive areaId`**, **`Failed to save lead`**, **`Invalid JSON body`**, generic fallbacks).
- **`messageBn`** from API is preferred when present — good for localized server messages.
- **SearchableAreaSelect** has no error state styling or `aria-invalid` wiring.

### 2.3 Business rule vs data model (animal type)

- Product expectation: **animal type is required** for a sensible lead.
- **DB:** `Lead.animalKind` is **`AnimalKind?` (optional)**.
- **API:** Does not reject missing `animalKind`; parser returns `undefined`, lead may persist with **null** animal kind if client sends empty/missing value (consistent with optional schema).
- **Action in redesign:** Align UX + API: treat animal kind as **required at intake** (validate client-side + optionally enforce in `POST /api/leads` with clear `messageBn`).

### 2.4 Duplicate / competing titles

- **AppHeader:** “চিকিৎসার অনুরোধ”
- **Card `<h1>`:** “দ্রুত ডাক্তার অনুরোধ”
- Two primary headings dilute hierarchy and can confuse screen reader users (multiple “main” titles per perceived page).

### 2.5 Information density & grouping

- Long single column: contact, area, animal, problem, emergency (if enabled), address, media — **no section breaks** beyond implicit order.
- **Optional fields** (WhatsApp, address, media) sit between or after required blocks; **“ঐচ্ছিক”** labels exist but the wall of fields can still feel overwhelming.
- **SearchableAreaSelect** label uses `text-sm` while other labels use **base + semibold** — visual inconsistency.

### 2.6 Emergency actions

- Call + WhatsApp row **already exists** below intro copy — aligned with goal “near the top”.
- Could be tightened visually as a **compact trust strip** so the form feels shorter.

### 2.7 Success experience vs stated goals

- Current success path is **navigation to `/thank-you`** — strong confirmation, but **not** an on-page modal/toast.
- Goal asks for **success popup/modal/toast in Bengali** — either add **in-form confirmation dialog** before/after redirect, **or** treat thank-you as canonical and add a **short inline toast** on landing there; plan both options in §5.

### 2.8 Network / server failure

- Catch block sets a single Bengali sentence suggesting internet + call/WhatsApp — **no dedicated retry UI**, **no modal**, **no primary/secondary actions** (retry vs call vs WhatsApp) as first-class pattern.

### 2.9 Bottom nav & z-index

- **BottomNav** uses **`z-40`** (mobile fixed).
- **Area dropdown** uses **`z-20`** — listbox can render **under** the bottom bar when the field is low on the screen.
- **`main`** uses **`overflow-x-clip`** — unlikely to clip vertical dropdowns but worth testing with keyboard + scroll.

### 2.10 Sticky submit

- Submit is **in-flow** at bottom of form (not sticky). Risk today is **nav overlapping inputs** near the bottom — mitigated by **`pb-app-nav`** + extra section padding; still verify on **small Android / Safari** with keyboard open (virtual keyboard shrinks viewport — **extra risk** not fully addressed by static padding).

---

## 3. Field & content improvements (recommended)

### 3.1 Section structure (Bengali labels — tune copy in implementation)

| Section | Purpose | Fields |
|---------|---------|--------|
| **যোগাযোগের তথ্য** | Trust + reachability | Name, mobile, optional WhatsApp |
| **এলাকা ও অবস্থান** | Routing | Area (required), optional address / landmark |
| **পশুর তথ্য** | Clinical triage | Animal kind, conditional “other”, optional future fields if ever added |
| **সমস্যার বিবরণ** | Required narrative | Problem summary textarea |
| **অতিরিক্ত তথ্য** | Clearly secondary | Media links; if emergency selector exists, consider placement (either above “additional” or within problem section with strong helper text) |

### 3.2 Microcopy

- Short intro line: one sentence — **what happens after submit** (e.g. someone will call/message).
- Required: **“আবশ্যক”** or red asterisk with legend **“* আবশ্যক”** once at top of form.
- Optional: **“(ঐচ্ছিক)”** — keep consistent; avoid repeating long explanations on every optional control.
- Animal “OTHER”: short example placeholders (already partly done).
- Media URLs: explain **“লিংক থাকলে দিন — ছবি আপলোড শীঘ্রই”** if uploads are not ready (matches honest expectation).

### 3.3 Header alignment

- Single primary title: either **only** `AppHeader` **or** only in-body title — recommend **`AppHeader` = page title**, body = **subtitle / reassurance** without second `<h1>` (demote card heading to `h2` or visually styled text for one H1 per page).

---

## 4. Validation & error-popup strategy

### 4.1 Client-first validation (Bengali)

- Implement **explicit validation** (do not rely on native `required` while `noValidate` remains, **or** remove `noValidate` and supplement with custom messages — decision below).
- **Recommended:** Keep programmatic validation for **consistent Bengali** and **scroll-to-field**; optionally enable native validation **only if** copy can be localized (hard in pure HTML). Pragmatic path: **`react-hook-form` + Zod** or small custom reducer — **match existing stack** (project may prefer minimal deps; if no form library, manual state is acceptable).

**Rules (align with product):**

- Name: non-empty, reasonable max length (mirror API clamp if any).
- Mobile: valid BD format — reuse semantics from `normalizeBangladeshPhone` / shared validator.
- WhatsApp: empty OR valid (same family as phone).
- Area: `areaId` present and in `initialAreas` list.
- Animal: **must select** a kind; if OTHER, **animalTypeOther** non-empty.
- Problem (`serviceRequirement`): non-empty, max length awareness.

### 4.2 Visual error contract

- **Global:** On any submit validation failure, show a **dismissible alert** at the top (or **`role="alert"`** live region): **“কিছু তথ্য সঠিক নয় বা খালি আছে। নিচে লাল চিহ্নিত ঘরগুলো ঠিক করুন।”** (exact wording to be polished).
- **Per field:** Bengali message under control; **`aria-invalid="true"`**, **`aria-describedby`** → error id.
- **Styling:** `border-q-danger` / ring; invalid fields **high contrast** on white card.

### 4.3 Scroll / focus

- On submit with errors: **`element.scrollIntoView({ block: 'center', behavior: 'smooth' })`** + **`.focus()`** on first invalid field (respect **focus-visible** and **mobile**: avoid trapping focus if modal also opens — prefer **alert banner + scroll** without locking unless using a real dialog for errors).

### 4.4 Server-side errors

- Map **`messageBn`** first; maintain a **central map** English `error` → Bengali for legacy codes.
- Extend API where needed so **every 4xx/5xx** returns **`messageBn`** for public clients (optional refactor of `route.ts`).
- Field mapping when possible (e.g. phone invalid → phone field); generic errors → banner only.

### 4.5 Modal vs banner for “validation summary”

- **Banner + inline** meets visibility without blocking scroll-to-field.
- Optional **non-blocking** `dialog` with short text + “ঠিক আছে” that closes and leaves focus on first error — **nice-to-have** for low-tech users who miss the top banner.

---

## 5. Success & error-state strategy (network/server)

### 5.1 Success

**Option A (minimal change):** Keep **`router.push('/thank-you')`** as canonical success; enhance thank-you with **stronger first-screen confirmation** (already has success card).

**Option B (matches “popup” literally):** Before redirect, show **`dialog`** “আপনার অনুরোধ জমা হয়েছে” + **“ধন্যবাদ পেজে যান”** auto-advance after 1–2s **or** primary button — then navigate.

**Option C:** **Toast** on thank-you page mount (requires toast primitive — **not present** in repo today).

**Recommendation:** **Option B or A+toast on thank-you** — pick based on engineering cost; avoid duplicate success messages.

### 5.2 Network / 5xx / unknown

- **`dialog`** or full-width sheet: title **“জমা দেওয়া যায়নি”**, body explains **network/server**, actions: **আবার চেষ্টা** (retries submit), **কল করুন**, **WhatsApp** (reuse `landingTelHref` / `landingWhatsAppHref`).
- Preserve **`leadFormEnabled`** off state — existing **amber panel** with call/WA is good; keep parity.

---

## 6. Mobile layout fixes

- **Touch targets:** Already mostly **≥48–56px** — maintain.
- **Section spacing:** Increase **between** sections (`space-y` / dividers) to scan faster.
- **Keyboard:** On input focus, ensure **submit** remains reachable (scroll padding / optional **not-sticky** submit to avoid keyboard overlap — test iOS Safari).
- **Typography:** One calm scale; avoid shrinking Bengali below readable sizes on small screens.

---

## 7. Bottom navigation overlap — fix strategy

1. **Keep** `main` **`pb-app-nav`** — baseline clearance.
2. **Audit** redundant `pb-*` on inner sections; avoid **under-padding** by aligning to **one** source of truth (`pb-app-nav` **or** section, not conflicting).
3. **Area dropdown:** Raise overlay **`z-index`** above **`z-40`** when open (e.g. `z-50` on listbox container) **or** use **`Popover`** rooted in `portal` if added later.
4. **Sticky submit (optional):** If implemented, use **`padding-bottom`** on form equal to **`nav height + safe area + gap`** so the **last field never sits under** sticky CTA; **disable sticky** when keyboard is open if detection is unreliable (often skip sticky submit on mobile forms).

---

## 8. Files to change (expected)

| File | Likely changes |
|------|----------------|
| `src/components/landing/SimpleRequestForm.tsx` | Section layout, validation state, inline errors, summary alert, success/error dialogs, scroll-to-first-error, optional sticky submit experiment |
| `src/components/forms/SearchableAreaSelect.tsx` | Label typography parity, `error`/`aria-invalid`, z-index for dropdown, optional `description` slot |
| `src/app/request/page.tsx` | Header copy / `stackedTitleRow` / demote duplicate heading props if needed |
| `src/components/ui/AppShell.tsx` | Only if padding strategy changes globally (avoid unless necessary) |
| `src/app/globals.css` | Optional new token (e.g. `--q-bottom-nav-height`) for sticky CTA math |
| `src/app/api/leads/route.ts` | Optional: **`messageBn` on all errors**, enforce **required `animalKind`** with Bengali message |
| `src/lib/public-lead-intake.ts` | Optional: stricter animal rules if API enforces |
| **New** `src/components/ui/…` | **Confirm/Success dialog** using **`<dialog>`** or headless pattern — no dependency if native |

---

## 9. Implementation order

1. **Audit manual pass** on real device + Chrome DevTools mobile (confirm nav overlap + dropdown z-index).
2. **Information architecture:** section markup + heading levels + optional field grouping.
3. **Validation layer** + Bengali strings (central object or schema).
4. **Inline errors + banner + scroll/focus** first invalid field.
5. **SearchableAreaSelect** accessibility + styling + z-index.
6. **Network/server dialog** with retry + call/WhatsApp.
7. **Success UX** (dialog before redirect **or** thank-you enhancement).
8. **Optional:** API hardening (`messageBn` everywhere, required animal kind).
9. **Optional:** sticky submit with safe padding — only after keyboard testing.

---

## 10. Verification checklist

- [ ] **Mobile (≤639px):** No bottom nav obscuring **focused input**, **primary submit**, or **area dropdown** list.
- [ ] **Keyboard open (iOS/Android):** Last fields remain scrollable; no trapped focus.
- [ ] Submit with empty required fields → **top summary** + **inline Bengali** + **red borders** + **scroll/focus** to first error.
- [ ] Invalid BD phone → message on **phone** field + banner or mapped server message.
- [ ] Area missing / invalid → clear Bengali on **area** control.
- [ ] Animal OTHER without description → Bengali on **animalTypeOther**.
- [ ] Simulated **500** / network offline → **retry dialog** + **call** + **WhatsApp**.
- [ ] Successful submit → **clear Bengali success** (page or modal) + **thank-you** still shows **lead id** when returned.
- [ ] **`leadFormEnabled === false`** flow unchanged (call/WhatsApp fallback).
- [ ] **`areasUnavailable`** messaging + disabled submit still coherent.
- [ ] Screen reader: **one H1**, labels tied to inputs, **`aria-invalid`** on errors.
- [ ] **Business:** Lead still created with same **`POST /api/leads`** payload shape (unless API intentionally tightened).

---

## 11. Out of scope (this redesign phase)

- File upload for photos (URLs only today).
- Replacing thank-you route with in-app-only success (unless product chooses Option B/C).
- Full design system / new illustration assets.

---

*This document should be updated when implementation choices (e.g. form library vs manual, sticky submit yes/no) are finalized.*
