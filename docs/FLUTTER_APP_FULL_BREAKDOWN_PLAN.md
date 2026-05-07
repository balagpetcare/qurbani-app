# Quurbani 2026 — Flutter mobile app (full breakdown & roadmap)

This document is the **source-of-truth plan** for the native **Flutter** client in `D:\Qurbani2026\mobile_flutter`. The **Next.js** app in `qurbani-app` remains the **web, admin, and API backend**. The Flutter app is a **mobile-first client**; it does **not** mirror Next.js pages as WebViews.

**Backend inspection summary (2026-05-07)**

| Area | Finding |
|------|---------|
| **Public routes** | `/` landing, `/request` lead form, `/thank-you`, `/track`, `/doctors`, `/doctors/[id]`, `/offline`, `/doctor/*` portal, `/admin/*` portal |
| **Auth** | HMAC-signed token in httpOnly cookie `qurbani_auth` (`src/lib/auth-token.ts`). Middleware protects `/admin`, `/doctor`, `/api/admin/*`, `/api/doctor/*`. |
| **Mobile auth (added)** | `Authorization: Bearer <same token>` supported in middleware + `verifyAuthFromRequest` (Edge-safe). `POST /api/mobile/doctor/login` returns JSON `{ accessToken, tokenType, expiresInSec }`. |
| **Leads** | `POST /api/leads` public intake; `GET/POST` doctor lead APIs under `/api/doctor/leads/*` |
| **Areas** | `GET /api/areas` public list; Prisma `Area` with zones, `DoctorArea` mapping |
| **Privacy** | `src/lib/lead-privacy.ts` — doctor contact/address/phone hidden until lead assigned to that doctor; list rows include `canClaimPool` / `canAcceptAssigned` |
| **Notifications** | Prisma `Notification` model (in-app queue); `NotificationType`, channels; no end-user push infra in DB yet |
| **Media** | `Lead.mediaUrls` JSON text; `parseMediaUrlsField` — URLs only until signed uploads exist |
| **Case / billing** | `LeadCaseReport`, `LeadCaseBilling`; doctor complete via `/api/doctor/leads/[id]/complete` (web) |

---

## 1. Mandatory features (product + compliance)

- **Customer**: area selection, treatment request aligned with `POST /api/leads`, Bengali validation messaging, success confirmation, pull-to-refresh on lists.
- **Doctor**: password login via mobile token API, dashboard stats placeholder, lead list/detail using existing APIs, accept-case action, treatment-complete entry point (wired when API payloads stable).
- **App shell**: splash, onboarding, bottom navigation (customer + doctor variants), settings with legal links and logout.
- **Infrastructure**: centralized API client, environment-based base URL, secure token storage, structured empty/loading/error/offline states.
- **Permissions**: runtime requests only when a feature needs them; manifest/plist strings present before store submission.
- **Privacy**: no doctor private contact on public surfaces; customer PII hidden from doctors per server rules; data deletion **request** UI (processed by admin offline / future API).

## 2. Good-to-have (Phase 2–3)

- Customer **OTP / magic link** login and **“My requests”** backed by real APIs.
- In-app **Bangla** copy review with a native speaker; **Lottie** onboarding.
- **Deep links** (`quurbani://`) for lead status / doctor assignment notifications.
- **Image compression** before upload once signed URLs exist.
- **Doctor profile** photo upload from device.

## 3. Future advanced features

- **Social login** (Google / Facebook / Apple) for customers with backend account linking.
- **Push notifications** (FCM + APNs) tied to `Notification` or a new `DeviceToken` model.
- **Tutorial feed** with transcoding pipeline (e.g. FFmpeg server-side), admin moderation queue, engagement (like/comment/share).
- **Public case history** feed with **admin-approved** anonymized narratives (`LeadCaseReport.publicShowcaseEligible` already hints at this).
- **Chat** or **WhatsApp handoff** deep links with audit logging.

---

## 4. Next.js routes → Flutter screens (conceptual mapping)

| Next.js route | Flutter screen / module |
|---------------|-------------------------|
| `/` | Customer home (marketing summary, CTA to request) |
| `/request` | Treatment request form + area selection flow |
| `/thank-you` | Request success |
| `/track` | Future: track request (needs API) |
| `/doctors`, `/doctors/[id]` | Optional Phase: read-only doctor discovery (use public data APIs only; no private contact) |
| `/doctor/login` | Doctor auth |
| `/doctor`, `/doctor/leads`, `/doctor/leads/[id]` | Doctor dashboard, lead list, lead detail |
| `/doctor/settings` | Settings / profile (doctor subset) |
| `/doctor/apply` | Optional: open external web or in-app WebView to existing flow |
| `/admin/*` | **Not** replicated; remain on Next.js web |

---

## 5. Required API endpoints (existing)

| Endpoint | Use |
|----------|-----|
| `GET /api/areas` | Area picker |
| `POST /api/leads` | Customer intake |
| `POST /api/mobile/doctor/login` | Doctor mobile login → Bearer token |
| `GET /api/doctor/me` | Doctor profile (authenticated) |
| `GET /api/doctor/leads` | Lead list (query: `tab`, `page`, `area`) |
| `GET /api/doctor/leads/[id]` | Lead detail; `contactVisible` flag |
| `POST /api/doctor/leads/[id]/accept` | Accept / claim case |
| `POST /api/doctor/logout` | Optional cookie clear (mobile usually clears local token) |

## 6. Missing or planned API endpoints

| Need | Proposal |
|------|----------|
| Customer session + “my leads” | `POST /api/mobile/otp/start`, `POST /api/mobile/otp/verify`, `GET /api/mobile/me/leads` — requires `Customer` identity model or verified phone linkage to `Lead.phone` |
| Mobile public config | `GET /api/mobile/config` — feature flags, support WhatsApp, min app version |
| Signed media upload | `POST /api/mobile/media/upload-url` → S3/R2 signed PUT; persist in `Lead.mediaUrls` or new `LeadMedia` rows |
| Tutorials CRUD | `/api/mobile/tutorials` (public GET approved only); doctor `POST` draft; admin approve in Next.js |
| Engagement | `TutorialComment`, `TutorialLike`, `TutorialShare` + rate limits |
| Moderation | `ContentReport`, `UserBlock`, admin queues |
| Account deletion | `POST /api/mobile/me/delete-request` → creates `AccountDeletionRequest` for admin |

## 7. Database model changes (planned, not all required for Phase 1)

- **`CustomerUser`** (or extend `User` with `CUSTOMER` role): `id`, `phone`, `email`, OAuth ids, `createdAt`.
- **`OtpChallenge`**: hashed code, expiry, attempt count, throttle by phone/IP.
- **`DeviceToken`**: `userId`, `platform`, `token`, `createdAt` for FCM/APNs.
- **`Tutorial`**, **`TutorialRevision`**, **`TutorialModeration`**: status `DRAFT | PENDING_APPROVAL | PUBLISHED | REJECTED`; video URL, poster, Bengali title/body.
- **`TutorialComment`**, **`TutorialLike`**, **`TutorialShareEvent`** (analytics).
- **`ContentReport`**, **`UserBlock`**.
- **`PublicCaseHistory`**: anonymized fields only; `approvedByAdminId`, `sourceLeadId` (internal).
- **`AccountDeletionRequest`**: user reference, status, processedAt.

Existing models to leverage: `Lead`, `LeadCaseReport`, `LeadCaseBilling`, `User`, `Area`, `Notification`.

## 8. Auth & social login strategy

- **Today**: Doctor **email/phone + password**; token = same HMAC format as web cookie, sent as **Bearer** on mobile.
- **Customer (future)**: Start with **OTP to Bangladesh mobile** (normalized `01…` / `880…`); optional **magic link** email for staff testers.
- **Social (Google / Facebook / Apple)**: Use platform SDKs in Flutter; backend exchanges OAuth `id_token` for a Quurbani session JWT; link to `CustomerUser` by verified email/phone with conflict rules. **Phase 1**: placeholder buttons only.

## 9. OTP / mobile login strategy

- Normalize to DB format consistent with `normalizeBangladeshPhone` (`src/lib/phone.ts`).
- Server: rate limit per IP + per phone; OTP 6 digits; short TTL; lockout after N failures.
- Store **hashed** OTP only; use SMS provider (e.g. SSL Wireless, Twilio) — env-based.

## 10. Google / Facebook / Apple plan

- Register apps in each console; iOS URL schemes / Android SHA-1; server client secrets in env.
- Return Quurbani-issued Bearer token after OAuth verification; **no** long-lived third-party tokens stored on device beyond SDK session.

## 11. Location permission strategy

- **When**: e.g. “Add map link” or “nearest area hint” — on demand only.
- **How**: `WhenInUse` on iOS; `ACCESS_COARSE_LOCATION` / fine where justified on Android.
- **Fallback**: manual area picker (already primary).

## 12. Camera / gallery / microphone permission strategy

- **Camera / gallery**: request when user attaches lead media or doctor uploads tutorial thumbnail.
- **Microphone**: only if in-app video recording is added; otherwise omit. Phase 1: **structure only**, no recording flow.

## 13. Push notification strategy

- **FCM** (Android) + **APNs** (iOS) via Firebase or direct APNs.
- Store device tokens server-side; map to `User` (doctor) or `CustomerUser`.
- Payload types: new lead (doctor), assignment (customer), moderation outcome.
- **Phase 1**: `permission_service` + settings toggle placeholder; no backend token table until Phase 2.

## 14. Video upload / player / compression strategy

- **Upload**: signed URL → client PUT; server virus scan / transcode optional; max size and MIME allowlist (`video/mp4`).
- **Player**: `video_player` + future HLS if CDN transcoding.
- **Compression**: client-side `video_compress` optional before upload on metered networks; measure battery impact.

## 15. Tutorial module strategy

- Doctor creates draft → admin approves → public `GET` feed.
- Engagement features gated behind report/block; shadow-ban / strike system for repeat offenders.
- **Phase 1**: placeholder feed screen only.

## 16. Case history module strategy

- **Internal** doctor history: existing lead + case report APIs (respect privacy).
- **Public** case history: **never** show full name, phone, WhatsApp, full address by default; only admin-approved anonymized summary + generic animal/area bucket.
- **Phase 1**: placeholder screen + plan above.

## 17. Like / comment / share strategy

- Authenticated users only; idempotent like toggle; comments with Bengali profanity filter + report button; share = native share sheet + tracked server event for abuse analysis.

## 18. Report / block / moderation strategy

- **Report** with reason enum + free text; creates `ContentReport`.
- **Block** user → hide their tutorials/comments from reporter.
- Admin queue in Next.js; actions: dismiss, remove content, suspend user.

## 19. Privacy policy / data deletion strategy

- Host **Privacy Policy** and **Terms** on HTTPS web pages (existing or dedicated routes); Flutter **links out** via `url_launcher`.
- **Delete account request**: form collects reason + confirmation; stored for admin; final erasure script run out-of-band until automated API exists.

## 20. Play Store / App Store readiness checklist

- [ ] Privacy policy URL live
- [ ] Terms URL live
- [ ] Account deletion **request** path documented in policy
- [ ] Data safety form (Android) / privacy nutrition labels (iOS)
- [ ] Permission justifications (camera, photos, location, notifications) in listing + plist/manifest
- [ ] Content moderation story for any UGC (tutorials/comments)
- [ ] Age rating questionnaire
- [ ] Screenshots + Bengali/English listing
- [ ] ProGuard rules (Android) / bitcode settings (iOS) per chosen toolchain
- [ ] Signing: Play App Signing, Apple Distribution cert
- [ ] **production** `API_BASE_URL` over HTTPS; certificate pinning (optional hardening)

## 21. Folder structure (Flutter — clean architecture)

```
lib/
  main.dart
  app/
    app.dart
  core/
    config/
    network/
    storage/
    theme/
    permissions/
    media/
    phone/
    widgets/
  data/
    models/
    repositories/
  features/
    splash/
    onboarding/
    auth/
    customer/
    doctor/
    settings/
    tutorials/
    case_history/
    video/
  router/
```

## 22. Implementation phases

| Phase | Scope |
|-------|--------|
| **1 (current)** | Project scaffold, theme, splash, onboarding, auth UI, customer + doctor shells, API client + secure token, permissions/media/video placeholders, settings, Bengali errors |
| **2** | Customer OTP + my requests; signed media upload; maintenance/public flags from API |
| **3** | Push notifications; doctor treatment complete + billing forms parity with web |
| **4** | Tutorials + moderation + engagement; public case history |

## 23. Validation commands

**Flutter** (`mobile_flutter`):

```bash
flutter pub get
flutter analyze
flutter test
```

**Next.js** (`qurbani-app`, when backend touched):

```bash
npm run lint
npm run typecheck
npm run build
```

## 24. Manual testing checklist (Phase 1)

- [ ] Splash → onboarding (first run) → customer home
- [ ] Onboarding skip / completion persists
- [ ] `GET /api/areas` populates area picker; offline shows error state
- [ ] Lead submit validation (empty name/phone/area/service) shows Bengali messages
- [ ] Successful lead submit navigates to success screen
- [ ] Doctor login with invalid password shows error
- [ ] Doctor login stores token; app restart still authenticated
- [ ] Doctor leads list pull-to-refresh; 401 clears session navigates to login
- [ ] Lead detail shows masked contact when `contactVisible: false`
- [ ] Accept case button calls API; handles 409 conflict
- [ ] Settings: privacy/terms URLs open; logout clears doctor token
- [ ] Permission service: each method callable without crash (denied = graceful)

---

## 25. Risks & open items

- **Customer auth**: no server endpoints yet — “My requests” is placeholder.
- **CORS**: irrelevant for native iOS/Android; relevant only if testing Flutter **web** against API.
- **Lead list shows `customerName`**: acceptable for **assigned** doctor workflow; **public case history** must use separate anonymized API (planned).
- **Token in mobile**: treat as sensitive as a refresh token; use secure storage; consider shorter TTL + refresh in Phase 2.
- **iOS ATS**: production API must be HTTPS.

---

## 26. Revision log

- **2026-05-07**: Initial full breakdown + Phase 1 foundation; added Bearer auth + `POST /api/mobile/doctor/login`.
