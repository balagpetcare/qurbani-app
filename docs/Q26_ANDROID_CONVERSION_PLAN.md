# Quarbani 2026 — Android conversion plan

**Document:** `docs/Q26_ANDROID_CONVERSION_PLAN.md`  
**Scope:** Strategy for shipping a **doctor-first** Android experience from the existing Next.js web app, without duplicating business logic in native Kotlin until needed.

---

## 1. PWA-first approach (current phase)

1. **Installable web app** — `public/manifest.webmanifest` (`display: standalone`, `start_url: /`, theme colours aligned with landing). Icons use `src/app/icon.svg` (served as `/icon.svg`); replace with **192×192 and 512×512 PNG** (maskable + any) before store-style distribution.
2. **Mobile UX** — Sticky landing CTA (call / WhatsApp / request doctor), 48px+ tap targets on doctor lead actions, safe-area padding for notched devices (`env(safe-area-inset-*)`).
3. **Metadata** — Root layout sets `applicationName`, `appleWebApp`, `themeColor`, manifest link, and Open Graph basics where `NEXT_PUBLIC_APP_URL` is set.
4. **Offline** — Static `/offline` page documents expectations. **No service worker yet**; add Workbox (or Serwist) later to precache shell + show offline fallback on navigation failure.
5. **Checklist before “PWA done”** — Test Add to Home Screen on Chrome Android; verify manifest in DevTools → Application; confirm doctor/admin flows over HTTPS in production.

---

## 2. Capacitor option (hybrid shell)

When PWA limitations matter (background tasks, tighter icon/splash control, Play Store presence):

1. **Wrap the production URL** in a Capacitor shell (`@capacitor/core`, `@capacitor/android`), load `https://<production-domain>/` in the WebView.
2. **Doctor build profile** — Default start path `/doctor` after login cookie set (or deep link from native splash into `/doctor/login`).
3. **Plugins roadmap** — `@capacitor/push-notifications`, `@capacitor/app` (app URL open), `@capacitor/geolocation` only if product requires it (privacy review).
4. **Release** — Use Android App Bundle, Play App Signing, internal testing track first.

**Trade-offs:** Native shell updates are separate from web deploys unless using live WebView URL (recommended for single source of truth).

---

## 3. Doctor app priority

1. **Primary user on mobile** — Field vets triage leads, call customers, open maps; optimise `/doctor`, `/doctor/leads`, `/doctor/leads/[id]` first.
2. **Auth** — Keep HTTP-only JWT cookies; Capacitor must use **HTTPS** origin and `SameSite` settings compatible with WebView (test `doctor/login` → session persistence).
3. **Performance** — Keep doctor list payloads lean; lazy-load heavy sections on lead detail if the page grows.
4. **Future native** — If a Kotlin-only doctor app is built later, reuse the same REST/route handlers under `/api/doctor/*`.

---

## 4. Push notification future plan

1. **Web Push (PWA)** — VAPID keys, service worker `push` event, store subscriptions in DB keyed by `userId` + device; admin/doctor notification preferences.
2. **Capacitor** — FCM via `@capacitor/push-notifications`; map FCM token → same backend table as web push where possible.
3. **Product rules** — Emergency lead → high-priority channel; throttle non-urgent; respect quiet hours (configurable).

---

## 5. Google Maps / deep link plan

1. **Today** — Leads may store `googleMapUrl`; doctor UI exposes **মানচিত্র** as external link (`target="_blank"`).
2. **Improvements** — Parse coordinates if stored later; use `geo:lat,lng` or `https://www.google.com/maps/search/?api=1&query=` for one-tap open in installed Maps app from Capacitor `Browser` or `App.openUrl`.
3. **Deep links** — Universal links / intent filters: e.g. `https://<domain>/doctor/leads/123` opened from SMS/email should land in WebView after auth (middleware + `from` query pattern already used for login redirect).

---

## 6. Media upload plan

1. **Current** — Media URLs as text on leads; doctor sees `DoctorLeadMediaStrip`.
2. **Next** — Signed uploads (S3/R2 + presigned PUT), virus scan hook, size limits; thumbnail pipeline for images.
3. **Android** — Capacitor `Camera` / file picker uploads to same API; keep MIME whitelist and Bangladesh compliance (data residency) in infra checklist.

---

## 7. Build / release checklist

| Step | Web (PWA) | Capacitor / Play |
|------|-----------|------------------|
| HTTPS everywhere | ✓ | ✓ |
| `NEXT_PUBLIC_APP_URL` / API base correct | ✓ | ✓ |
| Replace SVG placeholder icons with PNG 192/512 | Recommended | Required for store |
| Lighthouse PWA / performance pass | ✓ | ✓ |
| Doctor flows on real device (small + notched) | ✓ | ✓ |
| ProGuard / minify (native) | — | When native modules added |
| Play Console: privacy policy, content rating, data safety | — | ✓ |
| Rollback plan (previous web deploy) | ✓ | WebView URL = instant rollback |

---

## 8. References in repo

- Manifest: `public/manifest.webmanifest`
- Icons: `src/app/icon.svg` → `/icon.svg`
- Offline copy: `src/app/offline/page.tsx`
- Landing contact constants: `src/components/landing/constants.ts`, `landing-contact.ts`
