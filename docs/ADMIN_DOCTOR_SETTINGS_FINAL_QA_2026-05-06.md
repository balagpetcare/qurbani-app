# Admin & doctor settings — final QA (2026-05-06)

COMMAND 3/3 closure: phone/WhatsApp/tel normalization, mobile layout pass, hydration spot-check, automated verification, and this document.

## Final routes

| Area | Route | API (representative) |
|------|--------|----------------------|
| Public landing | `/` | — |
| Thank-you | `/thank-you` | — |
| Admin settings (main admin only) | `/admin/settings` | `GET` / `PATCH` `/api/admin/settings` |
| Doctor settings | `/doctor/settings` | `GET` / `PATCH` `/api/doctor/me`, `PATCH` `/api/doctor/me/password`, `POST` `/api/doctor/me/area-preference` |

## Final setting keys (`SITE_SETTING_KEYS`)

All keys are defined in `src/lib/site-setting-registry.ts` and persisted in `SiteSetting`:

- `website.public_site_title`
- `website.hero_title`
- `website.hero_subtitle`
- `contact.phone_call`
- `contact.whatsapp`
- `contact.emergency_hotline`
- `contact.email`
- `contact.address`
- `contact.facebook_url`
- `contact.messenger_url`
- `contact.google_maps_url`
- `leads.form_enabled`
- `leads.emergency_enabled`
- `leads.success_message`
- `applications.enabled`
- `notifications.admin_in_app_enabled`
- `notifications.doctor_in_app_enabled`
- `system.maintenance_mode`
- `system.public_site_enabled`
- `system.admin_notice`
- `seo.page_title`
- `seo.meta_description`
- `seo.facebook_pixel_id`
- `seo.google_analytics_id`

## Final admin capabilities

- View and edit all keys above via `/admin/settings` (UI loads merged DB + seed defaults).
- **Main admin only**: page uses `getMainAdminOnlyUser()`; staff admins are redirected to `/admin`. API uses `requireMainAdminFromRequest`.
- Contact fields: on save, valid Bangladesh mobiles normalize to stored **`8801XXXXXXXXX`** (digits only, no `+`). Invalid-but-numeric strings fall back to **digits-only** after stripping separators (for odd lines / legacy data). Landing still applies seed/constants fallback when a value is empty or unusable.

## Final doctor capabilities (`/api/doctor/me` PATCH)

- Allowed self-service fields only: name, phone, whatsapp, email, qualification, experience summary, short bio, available time text, availability status, profile photo URL, emergency flag, notification toggles.
- **Not** updatable via this route: `role`, `isActive`, assigned areas, admin-only flags, etc. (unknown keys are ignored; only whitelisted fields are written.)

## Phone / WhatsApp / tel behavior (COMMAND 3/3)

**Supported admin input styles** (for the three contact digit settings):

- `01XXXXXXXXX`
- `+8801XXXXXXXXX`
- `8801XXXXXXXXX`
- Spaces and hyphens (e.g. `01777-889-994`)

**WhatsApp (`wa.me`)** — via `landingWhatsAppHref` + `phoneToWhatsAppNumber`:

- Normalizes to international digits **without** `+`, e.g. `01777889994` → `8801777889994`, `+8801777889994` → `8801777889994`.

**Phone (`tel:`)** — via `landingTelHref` + `bangladeshTelHref`:

- Valid BD mobile → `tel:+8801XXXXXXXXX`.
- Other digit strings (e.g. some hotlines) → best-effort `tel:+{digits}` when long enough; otherwise `tel:{digits}`.

**Public landing fallbacks**:

- `buildLandingPayloadFromMap` + `getLandingPublicPayloadSafe`: missing DB rows use seed defaults; DB errors return seed-default payload.
- Empty contact strings resolve to `LANDING_SUPPORT_DIGITS` from `src/components/landing/constants.ts`.

**Files touched for formatting**

- `src/lib/phone.ts` — `normalizeBdContactSettingDigits`
- `src/components/landing/landing-contact.ts` — `landingTelHref`, `landingWhatsAppHref`
- `src/lib/site-settings.ts` — `landingContactDigits` for payload digits
- `src/app/api/admin/settings/route.ts` — normalize contact keys on PATCH

## Mobile QA (settings pages)

- `AdminSettingsForm` / `DoctorSettingsForm`: `min-w-0`, full-width inputs, `min-h-[44px]`–`48px` controls, `touch-manipulation` on primary actions, sticky safe-area padding on admin save bar.
- `/admin/settings` and `/doctor/settings` wrappers: `overflow-x-hidden` to reduce horizontal scroll on small viewports.
- Bengali copy uses normal block layout and wrapping (no `whitespace-nowrap` on long labels).

## Hydration QA

- **Admin / doctor settings**: no `Date.now` / `Math.random` in rendered markup; form state is initialized from server props (standard pattern).
- **Lead form** (`LeadForm.tsx`): uses `useSyncExternalStore` for a `mounted` flag to defer area-dependent UI when areas failed to load — intentional SSR/client alignment; not unstable random IDs in markup.

## Automated verification (2026-05-06)

Run from repo root:

```text
npx prisma validate   → schema valid
npx prisma generate   → Prisma Client generated
npm run lint          → eslint clean
npm run typecheck     → tsc --noEmit clean
npm run build         → Next.js 16.2.4 production build succeeded
```

Build note: Next.js reported deprecation of the `middleware` file convention in favor of `proxy` — framework migration item, not settings-specific.

## Manual browser checklist

1. **Main admin** opens `/admin/settings`, saves a contact field as `01777 889-994`, reloads: value stored as `8801777889994` (or digits-only if not a valid mobile).
2. **Staff admin** (non-main): `/admin/settings` redirects to `/admin`; `/api/admin/settings` returns 403/401 as implemented.
3. **Doctor** opens `/doctor/settings`, updates profile; cannot change assigned areas from this UI (copy explains admin-only).
4. **Public** `/`: hero/trust/sticky CTA show numbers from settings; **Call** opens `tel:+880…`; **WhatsApp** opens `https://wa.me/880…` (no `+` in path).
5. **`/thank-you`**: same link behavior for main + WhatsApp lines.
6. **Missing DB / empty contact**: landing still shows usable links using defaults (`getLandingPublicPayloadSafe` + `landing-contact` fallbacks).
7. **Doctor API abuse**: `PATCH /api/doctor/me` with `role: "ADMIN"` does not elevate role (field ignored).

## Remaining limitations / future improvements

- No dedicated admin UI yet for **approving/rejecting** `DoctorAreaPreferenceRequest` rows (workflow may be manual via DB or a future screen).
- **Emergency hotline** may be non-mobile; normalization favors BD mobiles — exotic numbers rely on digit-stripping + `bangladeshTelHref` fallback paths.
- **Next middleware → proxy**: plan framework upgrade path when team is ready.
- **Visual regression**: no automated Percy/Playwright suite for Bengali layouts; manual device pass still recommended before launch.

---

*End of COMMAND 3/3 QA record.*
