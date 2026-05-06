# Admin & Doctor Settings — Implementation Result

**Date:** 2026-05-06  
**Scope:** COMMAND 2/3 implementation (schema, seed, APIs, admin/doctor/public integration).

---

## Summary

The app now stores configurable site options in **`SiteSetting`** (metadata + JSON `value`), seeds safe Bengali-friendly defaults, exposes **`/admin/settings`** (main **ADMIN** only) with grouped Bengali forms, **`/doctor/settings`** for self-service doctor profile/preferences (with area-preference requests), and wires the **public landing**, **`/thank-you`**, **`POST /api/leads`**, **`POST /api/doctor-applications`**, and **notification creation** to those settings without changing core lead status / doctor access rules.

---

## Changed files (high level)

### Database / Prisma

- `prisma/schema.prisma` — `SiteSetting`, `DoctorAreaPreferenceRequest`, `DoctorAreaPreferenceStatus`, doctor fields on `User`.
- `prisma/migrations/20260505191613_site_settings_and_doctor_profile/migration.sql` — applied migration.
- `prisma/seed.ts` — upserts all `SITE_SETTING_SEED_ROWS` (does **not** overwrite existing values on re-seed).

### Libraries

- `src/lib/site-setting-registry.ts` — keys, labels, defaults.
- `src/lib/site-settings.ts` — load/merge helpers, landing payload, admin merge, coercion.
- `src/lib/admin-server-session.ts` — admin portal session helpers.
- `src/lib/auth-guards.ts` — `requireMainAdminFromRequest`.
- `src/lib/doctor-server-session.ts` — extended doctor select + pending area requests.
- `src/lib/landing-public-data.ts` — doctor preview uses `experienceSummary` then `notes`.
- `src/lib/queue-in-app-notification.ts` — gates admin/doctor in-app queue types.

### API routes

- `src/app/api/admin/settings/route.ts` — GET/PATCH (main admin only).
- `src/app/api/doctor/me/route.ts` — GET/PATCH profile.
- `src/app/api/doctor/me/password/route.ts` — PATCH password.
- `src/app/api/doctor/me/area-preference/route.ts` — POST pending area preference.
- `src/app/api/leads/route.ts` — lead form / emergency gates + admin notification gate.
- `src/app/api/doctor-applications/route.ts` — applications gate + admin notification gate.
- `src/app/api/admin/leads/[id]/assign-doctor/route.ts` — doctor notification gate (WhatsApp row + in-app).
- `src/app/api/doctor/leads/[id]/complete/route.ts` — doctor in-app notification gate.

### Admin UI

- `src/app/admin/settings/page.tsx` — settings hub (ADMIN-only).
- `src/components/admin/AdminSettingsForm.tsx` — grouped Bengali form + save.
- `src/components/admin/AdminNav.tsx` — async; notice banner; **সেটিংস** link for ADMIN only.
- `src/app/admin/doctors/new/page.tsx` — async (for async `AdminNav`).
- `src/app/admin/doctors/[id]/edit/page.tsx` — loads new doctor fields.
- `src/components/admin/DoctorEditForm.tsx` — admin can edit extended profile + notification prefs.
- `src/app/api/admin/doctors/[id]/route.ts` — GET/PATCH extended doctor fields.

### Doctor UI

- `src/app/doctor/settings/page.tsx`
- `src/components/doctor/DoctorSettingsForm.tsx`
- `src/components/doctor/DoctorLeadsNav.tsx` — **সেটিংস** link.

### Public landing

- `src/app/page.tsx` — settings-driven hero/footer/CTAs; maintenance/public-off; `generateMetadata`; analytics scripts.
- `src/components/landing/HeroSection.tsx` — props for titles + contact digits + form toggle.
- `src/components/landing/TrustSection.tsx` — contact props.
- `src/components/landing/StickyLandingCta.tsx` — contact props + form toggle.
- `src/components/landing/landing-contact.ts` — `landingTelHref(digits)`, `landingWhatsAppHref(digits)`.
- `src/components/landing/LeadForm.tsx` — disabled form UI; emergency options + submit clamp.
- `src/components/landing/PublicSiteMessages.tsx` — public-off / maintenance messages.
- `src/components/landing/LandingAnalyticsScripts.tsx` — Pixel / GA (sanitized IDs).
- `src/app/thank-you/page.tsx` — contact + custom thank-you message from settings.
- `src/app/doctor/apply/page.tsx` — respects applications enabled.
- `src/components/landing/DoctorApplicationForm.tsx` — shows `messageBn` when present.

### Documentation

- `docs/ADMIN_DOCTOR_SETTINGS_IMPLEMENTATION_RESULT_2026-05-06.md` — this file.

---

## Database / migration changes

1. **`SiteSetting`**  
   - `id`, `key` (unique), `value` (JSONB), `group`, `label`, `description?`, `isPublic`, timestamps.

2. **`User` (doctors)**  
   - `qualification`, `experienceSummary`, `shortBio`, `availableTimeText`, `availabilityStatus`, `profilePhotoUrl`, `notifyEmail`, `notifySms`, `notifyWhatsApp`.

3. **`DoctorAreaPreferenceRequest`**  
   - Pending area-change requests from doctors (`requestedAreaIds` JSON, status enum).

---

## Seed changes

- After admin + areas, seed **upserts** every row in `SITE_SETTING_SEED_ROWS`.
- **Update** path only refreshes metadata (`label`, `group`, `description`, `isPublic`) — **does not reset `value`**, so admin edits survive re-seeding.

---

## Admin settings implemented

- Single page **`/admin/settings`** with sections: Website, Contact, Leads, Applications, Notifications, SEO, System.
- API **`GET/PATCH /api/admin/settings`** — **requires cookie session + `User.role === ADMIN`** (STAFF gets 403).
- Optional **admin notice** banner via `system.admin_notice` (shown on all admin pages using `AdminNav`).
- Phone/WhatsApp/emergency fields normalized to digits on save.

---

## Doctor settings implemented

- **`/doctor/settings`**: profile/contact, qualification/experience/bio/schedule, availability code, emergency flag, notification prefs (stub for future channels), HTTPS profile photo URL, password change, **area preference request** (creates/replaces `PENDING` row).
- APIs under **`/api/doctor/me*`** — doctor session only; updates limited fields (no `isActive`/role).

---

## Routes added

| Route | Purpose |
|-------|---------|
| `/admin/settings` | Admin settings UI |
| `/doctor/settings` | Doctor self-settings |
| `GET/PATCH /api/admin/settings` | Settings CRUD |
| `GET/PATCH /api/doctor/me` | Doctor profile |
| `PATCH /api/doctor/me/password` | Password change |
| `POST /api/doctor/me/area-preference` | Area preference request |

---

## Commands run (2026-05-06)

- `npx prisma migrate dev` — migration applied (`site_settings_and_doctor_profile`).
- `npx prisma generate` — success.
- `npm run db:seed` — success (24 site settings upserted).
- `npm run typecheck` — success (after fixes).
- `npm run lint` — success.
- `npm run build` — success.

---

## Known limitations / next steps

1. **Staff (`UserRole.STAFF`)** cannot open `/admin/settings` or PATCH settings API; other admin routes unchanged.
2. **Doctor area preference**: stored as `PENDING` requests — **no dedicated admin UI** yet to approve/reject (admin can still assign areas via existing doctor edit + areas API).
3. **SEO/analytics**: injection runs on **`/` only** via `LandingAnalyticsScripts`; root `layout.tsx` defaults remain fallback for non-home routes.
4. **`queueInAppNotification`** only gates types listed there; other direct `prisma.notification.create` paths (if added later) need explicit checks.
5. **Public settings exposure**: landing reads via **`getLandingPublicPayloadSafe`** server-side — no public JSON endpoint for raw settings (avoids leaking `system.admin_notice`, etc.).
6. **Profile photo**: URL field only — upload pipeline not implemented.

---

## COMMAND 3/3 — suggested verification

1. Login as **main ADMIN** → open **`/admin/settings`**, change phone/WhatsApp → confirm **`/`** and **`/thank-you`** CTAs update after save (and hard refresh if CDN/browser cache).
2. Toggle **lead form off** → form replaced by Bengali notice; **`POST /api/leads`** returns 403 with `messageBn`.
3. Toggle **emergency leads off** → priority radios hide URGENT/EMERGENCY; API rejects tampered URGENT payload.
4. Toggle **applications off** → **`/doctor/apply`** shows closed message; **`POST /api/doctor-applications`** 403.
5. Toggle **admin/doctor notification flags** → submit lead / assign doctor / complete case and confirm **`Notification`** rows skipped per toggle.
6. Toggle **maintenance** / **public site off** → landing shows appropriate message; **`/admin`** and **`/doctor`** still reachable.
7. Login as **doctor** → **`/doctor/settings`** save profile + password + area preference; confirm **admin doctor edit** still overrides sensitive fields.
8. Re-run **`npm run db:seed`** and confirm **existing setting values** are **not** overwritten (metadata may update).

---

*End of implementation result.*
