# Mobile auth & lead media — API contract (Qurbani 2026)

**Backend:** `qurbani-app` (Next.js App Router + Prisma)  
**Flutter client:** `mobile_flutter` uses these endpoints with `API_BASE_URL` (see app env).

This document reflects **implemented routes** after aligning aliases and error shapes with the native app.

---

## 1. Standard JSON error shape

Most mobile-facing handlers return:

```json
{
  "ok": false,
  "code": "SOME_CODE",
  "error": "SOME_CODE",
  "message": "English or short diagnostic",
  "messageBn": "ব্যবহারকারীর জন্য বার্তা"
}
```

**Legacy compatibility:** older responses used only `error` + `messageBn`. Clients should prefer **`messageBn`** and **`code`** when present.

Success payloads often include **`ok: true`** where noted below.

---

## 2. Customer OTP

### Send OTP

| Path | Notes |
|------|--------|
| **`POST /api/mobile/otp/start`** | Canonical (Flutter default). |
| **`POST /api/mobile/auth/otp/send`** | **Alias** — identical handler (re-export). |

**Request**

```json
{ "phone": "01711234567" }
```

Accepts Bangladesh formats normalized server-side (`01…`, `+880…`, `880…`) via `normalizeBangladeshPhone`.

**Success (200)**

```json
{
  "ok": true,
  "challengeId": "<uuid>",
  "expiresInSec": 600,
  "messageBn": "…"
}
```

**Development only:** if `NODE_ENV !== "production"` **and** `MOBILE_OTP_DEV_REVEAL=1`, response may include **`devOtp`** (plaintext code). **Never enabled in production.**

**SMS:** Requires Twilio (or configured provider) env vars from `.env.example`; otherwise OTP is still created and challenge returned (SMS may be skipped — see server logs / `messageBn`).

### Verify OTP

| Path | Notes |
|------|--------|
| **`POST /api/mobile/otp/verify`** | Canonical. |
| **`POST /api/mobile/auth/otp/verify`** | **Alias** — identical handler. |

**Request**

```json
{
  "phone": "01711234567",
  "challengeId": "<uuid>",
  "code": "123456"
}
```

**Success (200)**

```json
{
  "ok": true,
  "success": true,
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSec": 2592000,
  "customer": {
    "id": 1,
    "name": "গ্রাহক",
    "phone": "01…",
    "email": null,
    "role": "CUSTOMER"
  }
}
```

Sets httpOnly session cookie (parity with web) in addition to Bearer token.

**Common error codes:** `INVALID_PHONE`, `INVALID_CODE`, `CHALLENGE_EXPIRED`, `WRONG_CODE`, `TOO_MANY_ATTEMPTS`, `RATE_LIMIT`, `PHONE_NOT_ELIGIBLE`, `SERVER_ERROR`.

---

## 3. Doctor login (mobile token)

**`POST /api/mobile/doctor/login`**

**Request**

```json
{
  "identifier": "doctor@clinic.com",
  "password": "plain password"
}
```

`identifier` may be **email**, **Bangladesh mobile** (normalized like OTP), or **numeric user id** (matches admin “doctor edit” user id when that workflow uses numeric ids).

**Success (200)**

```json
{
  "ok": true,
  "success": true,
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresInSec": 604800,
  "doctor": {
    "id": 1,
    "name": "…",
    "email": "…",
    "phone": "01…",
    "isActive": true
  }
}
```

**Common error codes**

| HTTP | code | Meaning |
|------|------|---------|
| 400 | `INVALID_JSON`, `MISSING_FIELDS` | Bad body / missing fields |
| 401 | `INVALID_CREDENTIALS`, `PASSWORD_NOT_SET` | Wrong password / no password |
| 403 | **`ACCOUNT_DISABLED`** | Doctor exists but **inactive** — distinct from wrong password |
| 503 | `SERVICE_UNAVAILABLE` | Server/DB failure |

---

## 4. Social login (customer)

### Unified endpoint

**`POST /api/mobile/auth/social`**

```json
{
  "provider": "GOOGLE",
  "idToken": "<google id_token>"
}
```

Facebook uses **`accessToken`** instead of `idToken`:

```json
{
  "provider": "FACEBOOK",
  "accessToken": "<facebook user access token>"
}
```

### Provider-specific aliases (same logic + validation)

| Method | Path |
|--------|------|
| POST | **`/api/mobile/auth/social/google`** |
| POST | **`/api/mobile/auth/social/facebook`** |

Body may omit `provider` for these routes (server forces the provider).

### Provider flags (no secrets)

**`GET /api/mobile/auth/social/config`**

```json
{ "providers": { "google": true, "facebook": false, "apple": false } }
```

### Not configured

If OIDC/OAuth for a provider is **not** configured server-side, the exchange returns **HTTP 501** with:

- `code`: **`NOT_CONFIGURED`**
- `messageBn`: **`এই লগইন পদ্ধতি এখনো কনফিগার করা হয়নি।`**

No fake login in production.

### Success

Same shape as OTP verify success (Bearer `accessToken`, `ok: true`, optional cookie).

---

## 5. Treatment request + media

### Create lead (JSON)

**`POST /api/leads`**

- **Content-Type:** `application/json` (not `multipart/form-data`).
- **`mediaUrls`:** JSON array of **HTTPS/HTTP URLs** (max **5** items total including manual links). Typically populated after the **signed upload** flow below.

Validation errors use the standard `{ ok: false, code, messageBn }` shape for the refactored branches (disabled form, invalid JSON, area rules, intake validation, etc.).

### Two-step media upload (recommended)

Implemented and aligned with Flutter:

1. **`POST /api/mobile/media/upload-url`** — returns signed upload target + intent when `BLOB_READ_WRITE_TOKEN` (Vercel Blob) is configured.
2. **`POST /api/mobile/media/ingest`** (or absolute URL from step 1) — multipart **`file`** + header **`X-Qurbani-Upload-Intent`**.

Limits / MIME types are enforced server-side (`src/lib/mobile-lead-media.ts`) — **images + MP4**, max **5** URLs on the lead, per-file size caps.

**Multipart upload directly on `/api/leads` is not implemented** — use JSON + URLs from the pipeline above.

---

## 6. Environment variables (reference)

See **`.env.example`** in the repo for authoritative names. Commonly:

| Concern | Examples |
|---------|----------|
| OTP SMS | Twilio / SMS gateway vars referenced by `sendCustomerOtpSmsIfConfigured` |
| OTP dev reveal | `MOBILE_OTP_DEV_REVEAL=1` (non-production only) |
| Blob uploads | `BLOB_READ_WRITE_TOKEN` |
| Google OAuth (social) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, allowed client IDs for native |
| Facebook OAuth | App ID + secret as used in `social-oidc-verify` |
| Session/JWT | `SESSION_SECRET` (and related auth token helpers) |

**Do not commit secrets.** Configure via hosting env / CI.

---

## 7. Test commands (maintainers)

From repository root `qurbani-app`:

```bash
npm run lint
npm run build
npx prisma validate
```

---

## 8. Known external setup

| Dependency | Purpose |
|------------|---------|
| **SMS (Twilio etc.)** | Deliver OTP to real devices when enabled |
| **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) | Signed lead media uploads |
| **Google Cloud / OAuth** | Verify Google `id_token` for social login |
| **Meta / Facebook app** | Verify Facebook user access token |
| **Production safety** | Keep `MOBILE_OTP_DEV_REVEAL` off; never expose OTP in API responses in prod |

---

*Last updated: implementation pass for Flutter/backend parity.*
