# Flutter + Next.js — customer OTP login and “My Requests”

**Date:** 2026-05-07  
**Scope:** Mobile customer identity, hashed OTP challenges, Bearer `CUSTOMER` tokens (separate from doctor tokens), and read-only lead list/detail scoped to verified phone ownership.

## OTP implemented / status

| Piece | Status |
|-------|--------|
| `UserRole.CUSTOMER` | Added (Prisma enum + migration). |
| `CustomerOtpChallenge` | Stores **bcrypt hash** of 6-digit code, TTL 10 min, max 5 verify attempts, `consumedAt` on success. |
| `POST /api/mobile/otp/start` | Validates BD phone, blocks phones already tied to non-`CUSTOMER` users, rate-limits, creates challenge, optional Twilio SMS when `SMS_OTP_ENABLED=1` + Twilio env complete. |
| `POST /api/mobile/otp/verify` | Validates challenge + code, marks consumed, upserts `User` (`CUSTOMER`), returns same HMAC Bearer format as doctors with `role: "CUSTOMER"`. |
| Dev OTP reveal | Only when `NODE_ENV !== "production"` **and** `MOBILE_OTP_DEV_REVEAL=1` → JSON field `devOtp`. Server logs a one-line dev hint when not production (no plaintext in prod). |
| Bengali errors | `src/lib/mobile-customer-otp-messages.ts` + API `messageBn` on 4xx/429. |

## My Requests implemented / status

| Piece | Status |
|-------|--------|
| `GET /api/mobile/me` | Requires Bearer `CUSTOMER`; returns `{ id, phone, name, role }`. |
| `GET /api/mobile/me/leads` | Same auth; returns leads where `Lead.phone` matches canonical `01…` **or** legacy `880…` variant (`bangladeshPhoneDatabaseVariants`). |
| `GET /api/mobile/me/leads/[id]` | Same auth + ownership check; 404 if id not owned. No admin notes / internal-only fields. |
| Flutter | Separate `CustomerApiClient` + secure `customer_access_token`; OTP phone → verify → shell “আমার অনুরোধ” list + detail route. |

## DB / API changes

- **Enum:** `UserRole` + `CUSTOMER`.
- **Table:** `CustomerOtpChallenge` (`id`, `phoneCanon`, `codeHash`, `expiresAt`, `attemptCount`, `consumedAt`, `createdAt`).
- **Index:** `Lead(phone, createdAt)` for customer listing.
- **Auth token:** `AuthRole` includes `"CUSTOMER"`; `verifyAuthToken` accepts it. Doctor/admin guards unchanged (`role === DOCTOR` / admin roles only).

## Rate limiting

In-memory (same pattern as public lead intake); env knobs in `.env.example`:

- `PUBLIC_OTP_START_RATE_*` (IP + phone)
- `PUBLIC_OTP_VERIFY_RATE_*` (IP + phone)

Production note: use Redis / Upstash for multi-instance parity (documented in `public-rate-limit.ts` header).

## Files changed (high level)

**Next.js:** `prisma/schema.prisma`, `prisma/migrations/20260507193000_customer_otp_challenge/migration.sql`, `src/lib/auth-token.ts`, `src/lib/public-rate-limit.ts`, `src/lib/mobile-customer-otp-messages.ts`, `src/lib/mobile-customer-auth.ts`, `src/lib/mobile-customer-leads.ts`, `src/lib/customer-otp-sms.ts`, `src/app/api/mobile/otp/start/route.ts`, `src/app/api/mobile/otp/verify/route.ts`, `src/app/api/mobile/me/route.ts`, `src/app/api/mobile/me/leads/route.ts`, `src/app/api/mobile/me/leads/[id]/route.ts`, `.env.example`.

**Flutter:** `lib/core/network/{doctor_api_client,customer_api_client}.dart`, `lib/core/network/api_client.dart`, `lib/core/storage/secure_token_store.dart`, `lib/core/session/auth_session.dart`, `lib/app/app_scope.dart`, `lib/data/*` (typed clients + `customer_session_repository.dart`), `lib/features/auth/customer_otp_{phone,verify}_screen.dart`, `lib/features/customer/customer_my_requests_screen.dart`, `lib/features/customer/customer_request_detail_screen.dart`, `lib/router/app_router.dart`, `lib/features/settings/customer_settings_screen.dart`; removed placeholder `customer_auth_screen.dart`, `my_requests_placeholder_screen.dart`.

## Validation (local)

```bash
cd qurbani-app && npx prisma generate && npx prisma validate && npm run lint && npm run typecheck && npm run build
cd ../mobile_flutter && flutter pub get && flutter analyze && flutter test
```

**Last run:** Prisma generate/validate OK; `npm run typecheck` + `npm run build` OK; `flutter analyze` no issues; `flutter test` 20 passed.

## Migration notes

1. Apply migration (dev): `cd qurbani-app && npx prisma migrate dev`  
   Deploy: `npx prisma migrate deploy`
2. Enum order: PostgreSQL appends `CUSTOMER` to `UserRole`; existing rows unchanged.
3. **Staff/doctor phones:** If `User.phone` is already `ADMIN`/`STAFF`/`DOCTOR`, customer OTP **start** and **verify** return 403 with Bengali copy (prevents hijacking staff identities).
4. **SMS:** Real sends only with `SMS_OTP_ENABLED=1` and full Twilio env; otherwise OTP is not sent (dev uses log / optional `MOBILE_OTP_DEV_REVEAL`).

---

**NEXT COMMAND TO RUN:** Command 9 — Push Notification Foundation
