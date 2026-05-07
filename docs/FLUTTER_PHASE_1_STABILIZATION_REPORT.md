# Flutter Phase 1 — stabilization report

**Date:** 2026-05-07  
**Inputs:** `docs/FLUTTER_APP_FULL_BREAKDOWN_PLAN.md`, `docs/FLUTTER_MOBILE_CURRENT_AUDIT.md`  
**Scope:** Phase 1 foundation only — no Phase 2 OTP/tutorials/video/social product work.

---

## Goals addressed

| # | Requirement | Status |
|---|-------------|--------|
| 1 | App boots without crash | **Done** — `AppConfig.load()` wrapped in try/catch so missing/malformed `app.env` does not throw at startup. |
| 2 | Splash works | **Verified** — route `/splash` → onboarding or home/doctor. |
| 3 | Onboarding persists | **Done** — `SharedPreferences` key `onboarding_complete_v1`; AppBar uses theme (consistent with brand). |
| 4 | Bengali theme / typography | **Done** — default `locale: Locale('bn')`, Noto Sans Bengali via `AppTheme`, body copy uses `textTheme` on key screens. |
| 5 | Bottom navigation | **Done** — customer/doctor `StatefulShellRoute`; tutorial tab icon → book (no “play/video” cue). |
| 6 | Customer home | **Done** — CTA + case history stub; **removed** home entry to video demo (out of Phase 1 scope). |
| 7 | Area list from `GET /api/areas` | **Done** — loading uses first-fetch guard (`_initialized`) so pull-to-refresh does not blank the screen incorrectly. |
| 8 | Treatment request UI | **Done** — scroll physics + keyboard dismiss on drag. |
| 9 | Bengali validation | **Done** — unchanged: alerts + API `messageBn`. |
| 10 | Request success | **Done** — `/customer/request-success`. |
| 11 | Doctor login UI | **Done** — mobile login API + token. |
| 12 | Secure token storage | **Done** — `flutter_secure_storage`. |
| 13 | Doctor dashboard shell | **Done** — `AsyncScaffoldBody` + first-load guard. |
| 14 | Doctor lead list shell | **Done** — same; empty state supports pull-to-refresh via `emptyContent`. |
| 15 | Lead detail shell | **Done** — `ErrorRetryBody.fromCaught` for errors. |
| 16 | Settings | **Done** — customer + doctor tabs; legal links. |
| 17 | Logout clears session | **Done** — `logoutRemote()` (best-effort `POST /api/doctor/logout`) + `AuthSession.logoutDoctor()`. |
| 18 | Reusable loading / empty / error / offline | **Done** — `AsyncScaffoldBody`, `ErrorRetryBody.fromCaught`, `ApiException.looksOffline`, `EmptyStateBody` / `LoadingCard` unified. |
| 19 | API base URL from env | **Done** — `assets/env/app.env` + `--dart-define`; safe load fallback. |

---

## Out of scope (explicitly deferred)

- Video player package and `/video` route (**removed** from Phase 1).
- Social login UI buttons (replaced by copy-only notice on customer auth).
- Tutorial **content** (tab remains; screen is static Bengali “ফেজ ২” message).
- OTP / “my requests” APIs.

---

## Technical changes (summary)

- **`pubspec.yaml`:** Wider SDK constraint `>=3.5.0 <4.0.0`; removed `video_player`.
- **`AppConfig`:** Non-throwing env load.
- **`ApiException`:** `looksOffline` getter for UI.
- **`ErrorRetryBody`:** `fromCaught` factory; wifi vs generic icon.
- **`AsyncScaffoldBody`:** New reusable loader; optional `emptyContent`.
- **Screens:** Area / doctor dashboard / leads use `_initialized` for first-load vs refresh; lists use `AlwaysScrollableScrollPhysics` for `RefreshIndicator`.
- **Router:** `errorBuilder` for unknown routes; `/video` removed.
- **Doctor:** `DoctorRepository.logoutRemote()`; settings logout order: remote → local.
- **Tests:** `test/api_exception_test.dart` for offline detection.

---

## Validation (authoritative run)

```text
cd mobile_flutter
flutter pub get
flutter analyze   # No issues found
flutter test      # All tests passed (phone normalize + ApiException)
```

**Next.js:** No source changes in `qurbani-app` for this stabilization; `npm run lint` / `npm run typecheck` not required for this commit (optional CI: unchanged).

---

## Manual test checklist

1. Cold start: app opens splash → onboarding (first install) or home (returning).  
2. Complete onboarding → customer auth → guest → home.  
3. Bottom nav: all four customer tabs open without red screen.  
4. চিকিৎসার অনুরোধ → area list loads (with dev server) or shows Bengali error + retry.  
5. Submit form with invalid phone → Bengali alert.  
6. Valid submit → success + reference id.  
7. Doctor login → dashboard → leads → open lead → back.  
8. Airplane mode on area list → offline-style error + retry.  
9. Doctor settings → logout → token cleared; protected routes redirect to login.  
10. Open nonsense deep link → friendly “পেজ নেই” page.

---

## Follow-ups (not Phase 1)

- Regenerate iOS/Android plugin registrants on each machine after `flutter pub get` (video_player removed).  
- Optional: call `POST /api/doctor/logout` from more exit paths.  
- Tab switch on doctor leads may briefly show previous tab’s rows until network returns — acceptable for Phase 1.
