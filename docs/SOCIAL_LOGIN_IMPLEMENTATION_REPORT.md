# Social login implementation report (Quurbani 2026 — customer mobile)

**Date:** 2026-05-07  
**Scope:** Google, Facebook, and Apple sign-in for **customer** users (`UserRole.CUSTOMER`), server verification, `CustomerSocialLink` account linking, Bengali API errors, Flutter integration behind config. **OTP login remains the primary path for verified-phone flows** (e.g. “আমার অনুরোধ”).

## Social login status

| Area | Status |
|------|--------|
| `POST /api/mobile/auth/social` | **Implemented** — verifies provider token, links account, returns Quurbani **HMAC Bearer** `accessToken` + optional httpOnly cookie (same pattern as OTP verify). |
| `GET /api/mobile/auth/social/config` | **Implemented** — `{ providers: { google, facebook, apple } }` booleans only (no secrets). |
| OAuth verification | **Implemented** — `src/lib/social-oidc-verify.ts` (Google tokeninfo, Facebook `debug_token`, Apple JWKS via `jose`). |
| Account linking | **Implemented** — `CustomerSocialLink` (`provider` + `providerSubject` unique; one link per provider per user). |
| Conflict handling + Bengali copy | **Implemented** — `src/lib/mobile-social-auth-messages.ts` + `src/lib/mobile-social-auth-service.ts`. |
| Store long-lived IdP tokens | **Not stored** — clients send short-lived credentials per login; app keeps only Quurbani Bearer in secure storage. |
| Flutter Google / Facebook / Apple | **Conditional** — buttons only when **server** config and **local public** app keys exist (`GOOGLE_SIGN_IN_SERVER_CLIENT_ID`, `FACEBOOK_APP_ID`, iOS Apple capability). |
| Secure token storage (Flutter) | **Unchanged** — `flutter_secure_storage` via `AuthSession.setCustomerToken`. |

## Architecture (short)

1. Flutter calls **`GET /api/mobile/auth/social/config`** to see which providers the server can verify.
2. Native SDKs obtain a **short-lived credential**: Google / Apple **`id_token`**, Facebook **user access token** (exchanged server-side; not persisted on device after success where applicable).
3. Flutter calls **`POST /api/mobile/auth/social`** with `{ provider: "GOOGLE" \| "FACEBOOK" \| "APPLE", idToken?, accessToken? }`.
4. Server validates the token, resolves `CustomerSocialLink` + `User` (CUSTOMER), issues **`signAuthToken`** JWT — same shape as `POST /api/mobile/otp/verify`.
5. **“My leads”** still requires a **verified Bangladesh mobile**; `GET /api/mobile/me/leads` returns **403** with Bengali copy until OTP completes (`phoneVerifiedAt`).

## HTTP APIs

| Method | Path | Notes |
|--------|------|------|
| `GET` | `/api/mobile/auth/social/config` | Which providers are configured server-side. |
| `POST` | `/api/mobile/auth/social` | Body: `provider`, `idToken` (Google, Apple) or `accessToken` (Facebook). Response: `accessToken`, `tokenType`, `expiresInSec`. |

## Conflict rules (server)

| Code | When | Bengali (`messageBn`) |
|------|------|------------------------|
| `EMAIL_IN_USE_NON_CUSTOMER` | Email matches `User` with role ≠ CUSTOMER | See `SOCIAL_EMAIL_IN_USE_BN` |
| `PHONE_NOT_VERIFIED` | Email matches CUSTOMER with `phone` set but `phoneVerifiedAt` null | `SOCIAL_PHONE_NOT_VERIFIED_BN` |
| `PROVIDER_TYPE_CONFLICT` | Same user already has **another** subject for this provider | `SOCIAL_PROVIDER_TYPE_CONFLICT_BN` |
| `PROVIDER_ALREADY_LINKED` | This provider subject is linked to a **different** user | `SOCIAL_PROVIDER_ALREADY_LINKED_BN` |
| `ACCOUNT_CONFLICT` | DB unique constraint (e.g. race on email/subject) | `SOCIAL_ACCOUNT_CONFLICT_BN` |
| `EMAIL_REQUIRED` | No verified email from provider (e.g. Apple without email on first claim) | `SOCIAL_EMAIL_REQUIRED_BN` |

Returning users with an existing **`CustomerSocialLink`** are signed in **without** requiring email in the Apple token (lookup by `provider` + `providerSubject` happens before email merge).

## Required external setup

### Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth client ID** of type **Web application** — use its client id as Flutter **`GOOGLE_SIGN_IN_SERVER_CLIENT_ID`** so `GoogleSignIn` returns an **`id_token`** whose `aud` matches the backend allowlist.
3. Add **Android** OAuth client (package name + SHA-1) and **iOS** client (bundle id) as needed for Play Services / Apple.
4. Server: set **`GOOGLE_OAUTH_CLIENT_IDS`** (comma-separated) or **`GOOGLE_WEB_CLIENT_ID`** to include **every** audience you issue tokens for (must include the web client id used on mobile for `id_token`).

### Meta (Facebook) Developer Console

1. [Meta for Developers](https://developers.facebook.com/) → Create app (e.g. Consumer) → add **Facebook Login**.
2. **`FACEBOOK_APP_ID`** — public; same as Flutter `FACEBOOK_APP_ID` / Android `facebook_app_id`.
3. **`FACEBOOK_APP_SECRET`** — **server only**; used for Graph **`debug_token`** (never ship in the app).
4. Android: add **key hashes** (debug + release). iOS: bundle id, URL schemes (`fb{APP_ID}`), enable LoginKit per Meta docs.
5. Optional public **client token** in Android `strings.xml` — not the app secret.

### Apple Developer

1. Enable **Sign In with Apple** on the app’s **App ID** (Identifiers).
2. Xcode → Signing & Capabilities → **Sign In with Apple**.
3. Server **`APPLE_CLIENT_ID`**: comma-separated list of identifiers that appear as JWT **`aud`** (often **bundle id** for native iOS; add **Services ID** if you use web/cross-platform).
4. Apple may omit **`email`** in the identity token on repeat sign-ins; existing **`CustomerSocialLink`** rows still allow login by **`sub`**.

## Server environment variables

See **`.env.example`** (section “Mobile customer social login”). Summary:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_OAUTH_CLIENT_IDS` / `GOOGLE_WEB_CLIENT_ID` | Allowed `aud` values for Google `id_token`. |
| `FACEBOOK_APP_ID` | Facebook application id. |
| `FACEBOOK_APP_SECRET` | **Server only** — Graph `debug_token`. |
| `APPLE_CLIENT_ID` | One or more comma-separated audience strings for Apple JWT verification. |

**Never** commit real secrets; use host/CI secret stores in production.

## Key files (backend)

| File | Role |
|------|------|
| `src/lib/social-oidc-verify.ts` | Google / Facebook / Apple token verification + `is*OAuthConfigured()` helpers. |
| `src/lib/mobile-social-auth-service.ts` | Account linking, conflicts, user create/link. |
| `src/lib/mobile-social-auth-messages.ts` | Bengali API strings. |
| `src/app/api/mobile/auth/social/route.ts` | `POST` handler + JWT issuance. |
| `src/app/api/mobile/auth/social/config/route.ts` | `GET` provider flags. |
| `prisma/schema.prisma` | `CustomerSocialLink`, `SocialAuthProvider` |

## Key files (Flutter — `mobile_flutter`)

| File | Role |
|------|------|
| `lib/features/auth/social/customer_social_sign_in.dart` | SDK: Google `id_token`, Facebook access token, Apple `identityToken`; clears provider session after exchange where applicable. |
| `lib/data/customer_session_repository.dart` | `fetchSocialAuthConfig`, `exchangeSocialLogin`. |
| `lib/features/auth/customer_otp_phone_screen.dart` | OTP primary + conditional social buttons. |
| `lib/core/session/auth_session.dart` | Secure Quurbani token storage. |
| `lib/core/config/app_config.dart` | Public `GOOGLE_SIGN_IN_SERVER_CLIENT_ID`, `FACEBOOK_APP_ID`. |

## Validation (2026-05-07)

**qurbani-app:** `npx prisma generate` — OK · `npm run lint` — OK · `npm run typecheck` — OK  

**mobile_flutter:** `flutter pub get` — OK · `flutter analyze` — OK (no issues)

---

**NEXT COMMAND TO RUN:** Command 15 - Android/iOS Release Readiness Audit
