# Doctor mobile login — diagnosis and fix (Quurbani 2026)

**Date:** 2026-05-07  
**Repos:** `qurbani-app` (Next.js), `mobile_flutter` (Flutter)

---

## 1. Diagnosis (before this fix)

### What was inspected

- **Backend:** `POST /api/mobile/doctor/login`, `POST /api/doctor/login`, `authenticateDoctorWithPassword` (`src/lib/doctor-password-login.ts`), admin `POST/PATCH /api/admin/doctors`, Prisma `User` (role `DOCTOR`, `passwordHash`, `isActive`, `phone` / `email`).
- **Flutter:** `DoctorRepository.loginMobileAccessToken` → `/api/mobile/doctor/login`, `DoctorAuthScreen`, `AppConfig.apiBaseUrl`, `DoctorApiClient` / `ApiException`.
- **Middleware:** `/api/mobile/*` is **not** behind doctor auth middleware (matcher only covers `/api/doctor/:path*`), so mobile login was not blocked by middleware.

### Root causes identified

1. **Identifier mismatch (UX / expectations)**  
   Admins and doctors often refer to the numeric **user id** from URLs such as `/admin/doctors/42/edit`. The login API only matched **email** (if `@` present) or **phone** variants. Logging in with **“42”** failed even when the password was correct.

2. **Inactive vs wrong password (misleading errors)**  
   `authenticateDoctorWithPassword` required `isActive: true` inside the Prisma `where` clause. **Inactive** doctors therefore looked identical to “wrong email/phone/password”, which made support/debugging harder and did not match the product requirement for a clear “account not active” message.

3. **Alternate JSON body keys**  
   The canonical mobile body is `{ "identifier", "password" }`. Any client sending only `phone` / `email` / `doctorId` would send an **empty** identifier and get **400**, even with valid credentials.

4. **Optional admin PATCH foot-gun**  
   If a client sent `"password": ""` on `PATCH /api/admin/doctors/[id]`, the handler treated it as an update attempt and could return **400** (“password must be at least 8 characters”) instead of ignoring empty passwords. The bundled admin UI omits the field when blank; this hardening protects other API clients.

5. **Flutter error surfacing**  
   Missing `accessToken` threw `StateError` with an English message. API errors without `messageBn` showed English server strings in alerts.

### What was *not* the primary bug

- **Bcrypt / admin create:** `POST /api/admin/doctors` already hashes passwords with `bcryptjs` (cost 12) and sets `passwordHash` on the `User` row with `role: DOCTOR`.
- **Bangladesh phone normalization:** `normalizeBangladeshPhone` already supports `017…`, `+88017…`, `88017…`, etc.; lookup also tries raw `phone` as stored.

---

## 2. Fixes applied

| Area | Change |
|------|--------|
| **Backend login** | Resolve doctor by **email**, **phone** (normalized + `880…` + raw), then by **numeric user id** when the string looks like an id (not an 11-digit mobile). |
| **Active / password** | Load doctor **without** `isActive` in the lookup, then return **403** + Bengali copy if inactive; **401** + Bengali if `passwordHash` is null or password wrong. |
| **JSON body** | `pickDoctorLoginIdentifier` / `pickDoctorLoginPassword` (`src/lib/doctor-login-body.ts`): `identifier` **or** `phone` **or** `email` **or** `doctorId`. |
| **API responses** | Login error JSON includes **`messageBn`** alongside `error` for Flutter `ApiException`. |
| **Admin PATCH** | Only hash/update password when the provided password string is **non-empty**. |
| **Seed (dev)** | Optional `DOCTOR_SEED_EMAIL`, `DOCTOR_SEED_PHONE`, `DOCTOR_SEED_PASSWORD` (+ optional `DOCTOR_SEED_NAME`) upserts a dev doctor **only when all three are set** — never touches production unless you set these vars. |
| **Flutter** | Doctor login field label/hint documents **email / mobile / doctor id**; `DoctorRepository` throws `ApiException` if token missing; offline-specific Bengali copy on the auth screen. |

---

## 3. Doctor login — URL and identifier format

| Client | URL | Method | Body |
|--------|-----|--------|------|
| **Flutter (production)** | `{API_BASE_URL}/api/mobile/doctor/login` | `POST` | `{ "identifier": "<email | phone | user id>", "password": "…" }` (or legacy: `phone`, `email`, `doctorId`) |
| **Web doctor portal** | `{origin}/api/doctor/login` | `POST` | Same coalescing rules |

**Recommended identifiers**

- **Email:** full address (case-insensitive).
- **Phone:** `017XXXXXXXX`, `+88017XXXXXXXX`, `88017XXXXXXXX`, etc.
- **Doctor user id:** integer **User.id** from admin (e.g. `5`). Do **not** confuse with lead id or application id.

**Password:** Same password set at admin create or changed via admin edit (“নতুন পাসওয়ার্ড”).

---

## 4. Manual / curl checks

Replace `BASE` and credentials.

```bash
BASE=https://qurbani.balagpetclinic.com

# Email + password
curl -sS -X POST "$BASE/api/mobile/doctor/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"doctor@example.com","password":"your-password"}'

# Local BD mobile
curl -sS -X POST "$BASE/api/mobile/doctor/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"01712345678","password":"your-password"}'

# +880 form
curl -sS -X POST "$BASE/api/mobile/doctor/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"+8801712345678","password":"your-password"}'

# Numeric user id (from admin URL /admin/doctors/42/edit)
curl -sS -X POST "$BASE/api/mobile/doctor/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"42","password":"your-password"}'

# Legacy keys
curl -sS -X POST "$BASE/api/mobile/doctor/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"01712345678","password":"your-password"}'
```

Success: HTTP **200**, JSON with `accessToken`, `tokenType`, `expiresInSec`.  
Then:

```bash
TOKEN='paste_accessToken_here'
curl -sS "$BASE/api/doctor/me" -H "Authorization: Bearer $TOKEN"
```

---

## 5. Dev seed doctor (optional)

Set in `.env` when running **local** seed only:

- `DOCTOR_SEED_EMAIL`
- `DOCTOR_SEED_PHONE` (valid Bangladesh mobile)
- `DOCTOR_SEED_PASSWORD` (min 8 characters)
- Optional: `DOCTOR_SEED_NAME`

Run: `npx prisma db seed`  
**Do not** set these on production unless you intend to reset that doctor’s password.

---

## 6. Validation (recorded from agent run)

**qurbani-app** — all completed with exit code 0:

- `npm run lint`
- `npm run typecheck`
- `npx prisma validate`
- `npm run test` (7 tests in `src/lib/doctor-login-body.test.ts`)
- `npm run build`

**mobile_flutter**

- `flutter analyze` — no issues
- `flutter test` — all tests passed

Production API example:

`flutter run --dart-define=API_BASE_URL=https://qurbani.balagpetclinic.com`

---

## 7. Deployment (backend changed)

After pulling changes on the server:

```bash
cd qurbani-app
npm ci
npx prisma migrate deploy   # if you use migrations
npm run build
# restart Node (pm2/systemd/docker) so the new route code is live
```

No new public env vars are **required** for this fix. Existing `SESSION_SECRET` remains required in production for token signing.

---

## 8. Files changed

**qurbani-app**

- `src/lib/doctor-password-login.ts` — lookup + inactive / no-password / Bengali fail messages; numeric id support.
- `src/lib/doctor-login-body.ts` — **new** body coalescing.
- `src/lib/doctor-login-body.test.ts` — **new** Vitest tests.
- `src/app/api/mobile/doctor/login/route.ts` — coalesced body + `messageBn` on errors.
- `src/app/api/doctor/login/route.ts` — same for web parity.
- `src/app/api/admin/doctors/[id]/route.ts` — ignore empty password string.
- `prisma/seed.ts` — optional dev doctor when `DOCTOR_SEED_*` set.
- `package.json` — `test` script + `vitest` devDependency.
- `vitest.config.ts` — **new**.

**mobile_flutter**

- `lib/data/doctor_repository.dart` — Bengali error if token missing.
- `lib/features/auth/doctor_auth_screen.dart` — labels + offline-aware alerts.

**Docs**

- `docs/DOCTOR_MOBILE_LOGIN_FIX_REPORT.md` — this file.

---

## 9. Remaining manual tasks

1. Confirm production **`SESSION_SECRET`** is set (otherwise login returns 503 after credential check).
2. Train admins: login uses **email, phone, or user id** — not lead id.
3. If a doctor still cannot log in: verify **`isActive`**, non-null **`email`/`phone`**, and **`passwordHash`** present in DB (admin can set a new password from edit form).
