# Flutter mobile app — current implementation audit

**Audit date:** 2026-05-07  
**Scope:** `mobile_flutter/` vs `docs/FLUTTER_APP_FULL_BREAKDOWN_PLAN.md` Phase 1 foundation, plus Next.js API compatibility.  
**Policy:** No new features in this pass — documentation and validation only.

---

## 1. What is already implemented

| Area | Status |
|------|--------|
| **Project scaffold** | Flutter app `quurbani_mobile` with Android/iOS targets, `README.md`. |
| **Routing** | `go_router` with splash, onboarding, customer/doctor shells, nested routes (`/customer/*`, `/doctor/*`, `/doctor/case/:lid`, overlays). |
| **Theme & typography** | `AppTheme`, `AppColors`, Noto Sans Bengali via `google_fonts`, Material 3, card/button styling. |
| **Splash & onboarding** | Branded gradient splash; 3-page onboarding with prefs flag `onboarding_complete_v1`. |
| **Customer auth UI** | Guest continue, disabled phone/email fields, social **placeholders** (dialogs only). |
| **Doctor auth** | `POST /api/mobile/doctor/login` → `accessToken` → `flutter_secure_storage`. |
| **Customer flow** | Home CTA, area list (`GET /api/areas`), treatment form (`POST /api/leads`), success screen, optional media URL lines. |
| **Doctor flow** | Dashboard (`GET /api/doctor/me`), leads list (`GET /api/doctor/leads` + tab query), detail (`GET /api/doctor/leads/[id]`), accept (`POST .../accept`), settings + logout. |
| **Bottom navigation** | Customer: হোম / আমার অনুরোধ / টিউটোরিয়াল / সেটিংস. Doctor: ড্যাশবোর্ড / লিড / সেটিংস. |
| **API layer** | `ApiClient` (Dio), Bearer injection from `AuthSession`, `validateStatus` + Bengali-friendly `ApiException` (`messageBn`). |
| **Env config** | `assets/env/app.env` + `--dart-define` overrides in `AppConfig`. |
| **Permissions** | `PermissionService` (location, camera, photos, mic, notification); dev tiles under customer settings. |
| **Media picker** | `MediaPickerService` (gallery/camera image + video pickers); exercised from settings dev section. |
| **Placeholders** | Tutorial feed, case history, video player (network demo), “treatment complete” dialog on lead detail. |
| **Settings / compliance UI** | Privacy/terms via `url_launcher`, report/block/delete-request copy, doctor portal link. |
| **BD phone** | Client normalization aligned with backend expectations (`core/phone/bd_phone.dart`) + unit tests. |
| **Android / iOS declarations** | `INTERNET`, location, camera, mic, media, notifications (Android manifest); usage strings (iOS `Info.plist`). |

---

## 2. What is partially implemented

| Item | Notes |
|------|--------|
| **Pull-to-refresh** | Used on area list and doctor list/dashboard where `RefreshScroll` is wired; not universally applied to every scroll screen. |
| **Loading / error / empty** | `LoadingCard`, `ErrorRetryBody`, `EmptyStateBody` exist; some screens rely on simple `SnackBar`/`AlertDialog` only. |
| **“No internet” UX** | No `connectivity_plus` (or equivalent); failures surface via Dio (`connectionError`) as generic Bengali messages. |
| **Doctor dashboard “stats”** | Copy-only placeholder; does not call `GET /api/doctor/my-stats` yet. |
| **Treatment complete** | UI button opens dialog only; no `POST /api/doctor/leads/[id]/complete` (or related) wiring. |
| **Customer “my requests”** | Placeholder screen only — no customer session API. |
| **Social login** | Buttons/alerts only — no OAuth packages or backend exchange. |
| **Push notifications** | Permission hook exists; no FCM/APNs packages or token registration. |
| **Native splash / app icon** | Flutter splash + default launcher; `assets/images/README.txt` — no `flutter_launcher_icons` / `flutter_native_splash` pipeline. |
| **Video / media upload** | URLs can be pasted into lead form; no image picker integration on the request form itself; no signed-upload API. |

---

## 3. What is missing from Phase 1 (vs plan intent)

Strict interpretation: **most Phase 1 UI/navigation goals are met.** Gaps vs the *ideal* Phase 1 bar described in the breakdown plan:

1. **Proactive offline detection** (optional package) — not added.  
2. **Crash reporting / analytics** — suggested in plan categories; not in `pubspec.yaml`.  
3. **Doctor logout → server** — app clears local token only; `POST /api/doctor/logout` not called (acceptable for stateless JWT-style usage; cookie on server may linger if ever set from mobile login).  
4. **Request form parity with web** — web form has more fields (priority, tri-bools, problem categories, etc.); mobile sends a **minimal** valid subset (`animalKind`, `serviceRequirement`, area, phones, optional `mediaUrls`).  
5. **Widget/integration tests** — only `test/phone_normalize_test.dart`; no router or API contract tests.

---

## 4. Broken files or compile issues

| Check | Result |
|-------|--------|
| `flutter analyze` | **No issues found** (see validation log below). |
| Dart compile | No broken imports or missing symbols observed in audit. |

**Environment caveat:** On some Windows setups, Flutter may warn that **symlink/Developer Mode** is required for plugin builds — not a Dart analyzer error, but can block local `flutter run` until enabled.

**SDK pin:** `pubspec.yaml` uses `sdk: ^3.12.0-133.0.dev` — matches a **dev/master** Dart line; stable Flutter users may need to relax this for broader machine support (not a compile error on the audited toolchain).

---

## 5. Missing packages (vs plan “suggested categories”)

Present: routing (`go_router`), HTTP (`dio`), secure storage, env (`flutter_dotenv`), permissions, image/video pickers, `video_player`, `url_launcher`, `google_fonts`, `provider`, `intl`, `flutter_localizations`.

Not present (optional / later phases):

- Social: `google_sign_in`, Facebook SDK, `sign_in_with_apple`  
- Push: `firebase_messaging` (+ setup)  
- Crash/analytics: e.g. `sentry_flutter`, Firebase Analytics  
- Network reachability: `connectivity_plus`  
- Video compression: `video_compress`  
- Tooling: `flutter_launcher_icons`, `flutter_native_splash`

---

## 6. Missing environment variables

**Flutter (`assets/env/app.env` or `--dart-define`):**

| Key | Purpose | Default in repo |
|-----|---------|------------------|
| `API_BASE_URL` | REST base (no trailing slash) | `http://10.0.2.2:3000` (Android emulator → host) |
| `PRIVACY_POLICY_URL` | Settings link | `https://example.com` |
| `TERMS_URL` | Settings link | `https://example.com` |

Optional compile-time overrides: `API_BASE_URL`, `PRIVACY_POLICY_URL`, `TERMS_URL` via `String.fromEnvironment` in `AppConfig`.

**Next.js (unchanged for mobile):** `SESSION_SECRET`, database URL, etc. — required for signing tokens used by mobile login.

---

## 7. Missing API endpoints (for current app ambitions)

The **Phase 1 wired** endpoints are available and used as designed:

- `GET /api/areas`, `POST /api/leads`  
- `POST /api/mobile/doctor/login`  
- `GET /api/doctor/me`, `GET /api/doctor/leads`, `GET /api/doctor/leads/[id]`, `POST /api/doctor/leads/[id]/accept`

**Still missing** for planned UX (post–Phase 1):

- Customer OTP + “my leads”  
- `GET /api/mobile/config`  
- Signed media upload  
- Tutorials / moderation / deletion-request APIs  
- Doctor treatment completion from mobile (`/complete` and related payloads)

---

## 8. Current Flutter run status

| Command | Result (2026-05-07 audit run) |
|---------|-------------------------------|
| `flutter pub get` | Success (`Got dependencies!`). |
| `flutter analyze` | **No issues found.** |
| `flutter test` | **All tests passed** (2 tests in `phone_normalize_test.dart`). |

**Note:** `flutter run` was not executed in this audit session (no device/emulator attached in CI context). Local run requires a device + reachable `API_BASE_URL` (e.g. `npm run dev` on host).

---

## 9. Current backend / API compatibility status

| Integration | Compatible? | Notes |
|-------------|-------------|--------|
| Bearer on `/api/doctor/*` | **Yes** | `verifyAuthFromRequest` in `auth-token.ts`; middleware uses same for `/api/doctor` gate. |
| `POST /api/mobile/doctor/login` | **Yes** | Returns `accessToken`; Flutter stores and sends `Authorization: Bearer …`. |
| `POST /api/leads` | **Yes** | JSON shape matches public intake; `source: mobile_app` set. |
| `GET /api/areas` | **Yes** | Parses `{ areas: [...] }`. |
| Lead privacy | **Yes** | UI respects `contactVisible`; server redacts PII per `lead-privacy.ts`. |
| CORS | N/A for **native** iOS/Android HTTP clients | Only relevant if testing Flutter **web** against API. |

Next.js **lint / typecheck** on `qurbani-app` at audit time: **pass** (see validation below).

---

## 10. Exact next command recommendation

**For day-to-day dev (backend + Android emulator):**

```bash
# Terminal A — from qurbani-app
npm run dev
```

```bash
# Terminal B — from mobile_flutter
flutter run -d android
```

**For Phase 1 stabilization (repo health):**

```bash
cd D:\Qurbani2026\mobile_flutter && flutter pub get && flutter analyze && flutter test
```

---

## Validation log (this audit)

| Step | Outcome |
|------|---------|
| `flutter pub get` (mobile_flutter) | OK |
| `flutter analyze` | OK — no issues |
| `flutter test` | OK — 2 passed |
| `npm run lint` (qurbani-app) | OK |
| `npm run typecheck` (qurbani-app) | OK |

---

## References

- Plan: `docs/FLUTTER_APP_FULL_BREAKDOWN_PLAN.md`  
- Mobile README: `mobile_flutter/README.md`  
- Mobile login route: `src/app/api/mobile/doctor/login/route.ts`  
- Auth verification: `src/lib/auth-token.ts` (`verifyAuthFromRequest`)
