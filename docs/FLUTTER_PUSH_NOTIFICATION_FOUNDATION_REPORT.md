# Flutter + Next.js — push notification foundation (FCM)

**Date:** 2026-05-07  
**Scope:** Client registration, DB storage, authenticated APIs, foreground/background **structure** (no production server-side sends until Admin SDK / credentials are configured).

## Push foundation implemented

| Area | Status |
|------|--------|
| Flutter packages | `firebase_core`, `firebase_messaging`, `flutter_local_notifications` |
| Permission | Requested **only** when the user turns on **পুশ নোটিফিকেশন** in doctor or customer settings (not on first app open). |
| Device token | `FirebaseMessaging.instance.getToken()` → `POST /api/mobile/device-token` with Bearer **doctor** or **customer**. |
| Toggle off / logout | `DELETE /api/mobile/device-token` + local `deleteToken()`; logout paths unregister **before** clearing session. |
| Foreground | `FirebaseMessaging.onMessage` → local notification + `debugPrint` routing stub by `data.type`. |
| Background | Top-level `firebaseMessagingBackgroundHandler` + `UIBackgroundModes` `remote-notification` (iOS). |
| Server push | **Not implemented** — no FCM Admin send in this change; env `GOOGLE_APPLICATION_CREDENTIALS` reserved for a future phase. |

## Firebase setup required

1. **Create a Firebase project** (or use an existing dev project): [Firebase Console](https://console.firebase.google.com/).
2. **Register apps**
   - **Android:** package name must match `applicationId` in `android/app/build.gradle.kts` (`com.quurbani.app.quurbani_mobile`). Download `google-services.json` → place at `mobile_flutter/android/app/google-services.json` (gitignored).
   - **iOS:** bundle id `com.quurbani.app.quurbaniMobile`. Download `GoogleService-Info.plist` → `mobile_flutter/ios/Runner/` (gitignored). In Xcode enable **Push Notifications** capability and configure APNs key/cert with Apple Developer.
3. **FlutterFire (recommended)** from `mobile_flutter/`:
   ```bash
   dart pub global activate flutterfire_cli
   flutterfire configure
   ```
   This overwrites `lib/firebase_options.dart` with real keys (still do **not** commit secrets to a public repo — use CI secrets / `flutterfire configure` on build agents).
4. **Android Gradle:** `com.google.gms.google-services` is applied **only** when `android/app/google-services.json` exists (so CI without Firebase still builds).
5. **Windows:** Flutter may warn about symlinks for plugins — enable **Developer Mode** if needed.

## DB / API changes

- **Enum:** `PushDevicePlatform` (`ANDROID` | `IOS`).
- **Model:** `PushDeviceToken` — `userId`, `platform`, unique `token` (`@db.Text`), timestamps; cascade delete with `User`.
- **`POST /api/mobile/device-token`** — JSON `{ token, platform }` where `platform` is `android` or `ios`; Bearer **DOCTOR** or **CUSTOMER**; upserts by `token` (rebinds to current user).
- **`DELETE /api/mobile/device-token`** — JSON `{ token }`; deletes row only if `token` belongs to authenticated user.
- **Rate limit:** in-memory per IP for POST (see `.env.example` `PUBLIC_DEVICE_TOKEN_RATE_*`).
- **Kinds (future payloads):** `src/lib/push-notification-kinds.ts` — `DOCTOR_NEW_LEAD`, `CUSTOMER_LEAD_UPDATE`, `TREATMENT_COMPLETED`, `MODERATION_RESULT` (align `data.type` with mobile `switch` stubs).

## Files changed (summary)

**Next.js:** `prisma/schema.prisma`, `prisma/migrations/20260507220000_push_device_token/migration.sql`, `src/lib/mobile-app-user-auth.ts`, `src/lib/push-notification-kinds.ts`, `src/app/api/mobile/device-token/route.ts`, `.env.example`.

**Flutter:** `pubspec.yaml`, `lib/main.dart`, `lib/firebase_options.dart` (placeholder), `lib/app/{app_scope,quurbani_app}.dart`, `lib/core/network/api_client.dart`, `lib/core/storage/preferences_store.dart`, `lib/data/mobile_device_token_repository.dart`, `lib/push/{push_notification_service,push_bootstrap,firebase_messaging_background}.dart`, `lib/features/settings/{push_notification_settings_tile,customer_settings_screen}.dart`, `lib/features/doctor/doctor_settings_tab_screen.dart`, `lib/features/auth/doctor_auth_screen.dart`, `android/settings.gradle.kts`, `android/app/build.gradle.kts`, `.gitignore`, `ios/Runner/Info.plist`.

**Docs:** `docs/FLUTTER_PUSH_NOTIFICATION_FOUNDATION_REPORT.md` (this file).

## Validation (local)

```bash
cd qurbani-app && npx prisma generate && npx prisma validate && npm run lint && npm run typecheck
cd ../mobile_flutter && flutter pub get && flutter analyze && flutter test
```

**Last run:** Prisma generate/validate OK; `npm run lint` + `typecheck` OK; `flutter analyze` no issues; `flutter test` 20 passed.

## Manual checks

1. Apply DB migration, run backend + app with real `firebase_options` + `google-services.json` / plist.
2. Doctor login → Settings → enable push → OS permission → row appears in `PushDeviceToken` for your user.
3. Toggle off → row removed for that token; `deleteToken` clears local install.
4. Foreground: send a test message from Firebase Console → banner / local notification (Android channel `quurbani_push_high`).

---

**NEXT COMMAND TO RUN:** Command 10 — Tutorial and Case History Data Model Plan
