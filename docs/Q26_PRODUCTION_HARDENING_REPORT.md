# Quarbani 2026 — Production hardening report

**Command:** Q26-CMD-14  
**Scope:** Hardening only — no new product features beyond abuse protection, observability hooks, and notification/PWA documentation.

---

## 1. What was changed

### 1.1 Public POST abuse protection

| Route | Mechanism |
|-------|-----------|
| `POST /api/leads` | In-memory **fixed-window** limits: per **client IP** + per **normalized phone** (`src/lib/public-rate-limit.ts`). Applied **after** basic validation (including WhatsApp format) so junk requests do not consume phone buckets. HTTP **429** with Bengali body `PUBLIC_RATE_LIMIT_MESSAGE_BN`. |
| `POST /api/doctor-applications` | Same pattern, stricter defaults for IP + phone. Applied after email/area presence checks. |

**Client IP:** `getClientIp` reads `x-forwarded-for` / `x-real-ip` (`src/lib/client-ip.ts`).

**Multi-instance production:** Replace the in-memory `Map` with **Redis** or **Upstash** using the **same key prefixes** (`lead:ip:`, `lead:phone:`, `app:ip:`, `app:phone:`). Documented in `.env.example`.

**Disable locally:** `PUBLIC_RATE_LIMIT_DISABLED=1`.

**Tunable env vars:** `PUBLIC_LEAD_RATE_*`, `PUBLIC_APP_RATE_*` (limits + window ms) — see `.env.example`.

### 1.2 Phone & duplicate behavior (review)

- **`normalizeBangladeshPhone`** (`src/lib/phone.ts`) continues to accept `880…`, `01…`, national `1…` after stripping `+` / spaces / leading `00`. JSDoc clarifies **+880** vs informal “+88” wording.
- **Duplicate leads:** unchanged — 24h window + `bangladeshPhoneDatabaseVariants` in `POST /api/leads`.
- **Duplicate doctor applications:** unchanged — pipeline status + phone/email checks.

### 1.3 Notification provider readiness

- **`src/lib/notifications/env.ts`** — documents `QURBANI_NOTIFICATION_WHATSAPP_DRIVER`, `SMS`, `EMAIL` (default `none`).
- **`src/lib/notifications/dispatch.ts`** — `dispatchOutboundNotificationPlaceholder` centralizes future branching; today returns `queued_db_only` / `placeholder_not_sent` / `skipped`.
- **`src/lib/delivery-channels.placeholder.ts`** — adds `sendEmailPlaceholder`; points to notifications module.
- **`src/lib/notifications/README.md`** — operator map + emergency marking note.

**Emergency:** Still encoded as `EMERGENCY_LEAD` + message prefixes at source routes (unchanged behavior).

### 1.4 Logging / observability

- **`src/lib/ops-log.ts`** — `logOps(event, payload)` emits one JSON line per event; **`maskPhoneForLog`**, **`maskEmailForLog`** (no full MSISDN or full email).
- **Events:**  
  - `lead_submitted` — after successful `POST /api/leads`  
  - `doctor_application_submitted` — after successful application create  
  - `admin_lead_assigned` — after successful assign (not unassign)  
  - `doctor_lead_accepted` — on successful accept  
  - `doctor_case_completed` — after successful complete  

**Not logged:** addresses, diagnosis text, service requirement body, customer name in ops lines (names may still appear in DB notification messages — pre-existing).

### 1.5 PWA / install

- **Manifest / `icon.svg`:** unchanged from CMD-12; references verified still valid.
- **New:** `docs/Q26_PWA_ICON_PNG_TODO.md` — checklist for real **192 / 512 maskable PNG** before store-grade install UX.

### 1.6 Service worker

- **Not added** (avoids cache staleness and auth edge cases without a dedicated worker design).
- **`/offline`** remains **informational** until a future **Workbox/Serwist** (or similar) precaches shell + maps navigation errors to offline fallback.

### 1.7 Documentation

- This file (`docs/Q26_PRODUCTION_HARDENING_REPORT.md`).
- Staging checklist: `docs/Q26_STAGING_SMOKE_TEST_CHECKLIST.md`.
- `.env.example` updated (rate limits + notification driver placeholders; fixed structure).

---

## 2. What was intentionally not changed

- No real Twilio/Meta/Resend integration or credentials.
- No alteration to JWT/cookie shape, middleware matchers, or doctor visibility rules.
- No change to admin notification row text (still may include customer phone in DB for ops — only **stdout logs** were hardened).
- No service worker / push subscription.

---

## 3. Remaining production risks

| Risk | Mitigation |
|------|------------|
| In-memory rate limit **not shared** across horizontal replicas | Move to Redis/Upstash before scaling out. |
| **IP spoofing** if `x-forwarded-for` untrusted | Terminate TLS at a trusted proxy; strip client-supplied junk headers at edge. |
| **DB notification rows** may still store PII in `message` | Future: redact or template messages; train staff. |
| **No automated E2E** in CI | Run `docs/Q26_STAGING_SMOKE_TEST_CHECKLIST.md` on staging. |

---

## 4. Required environment variables

**Minimum:** `DATABASE_URL`, `SESSION_SECRET` (production).

**Recommended:** `NEXT_PUBLIC_APP_URL` (HTTPS), seed/admin vars for first deploy.

**Optional (this command):** rate-limit and notification driver vars — see `.env.example`.

---

## 5. Deployment checklist

1. Apply migrations: `npx prisma migrate deploy`
2. Set secrets on host (never in git)
3. Confirm proxy forwards `x-forwarded-for` correctly
4. Smoke test using `docs/Q26_STAGING_SMOKE_TEST_CHECKLIST.md`
5. Monitor stdout / log drain for `logOps` JSON lines
6. Update `LANDING_SUPPORT_DIGITS` for production support line

---

## 6. Rollback notes

- **Code rollback:** revert deploy to previous image/commit — DB migrations may need separate plan if destructive (none added in this command).
- **Rate limits:** set `PUBLIC_RATE_LIMIT_DISABLED=1` temporarily if false positives (not recommended long-term).
- **Logs:** ops events are additive; no schema change for logging.

---

## 7. Service worker — future plan (exact intent)

1. Add **Serwist** or **Workbox** with **precache** only for static shell (`/`, `/offline`, fonts).
2. **Network-first** for all `/api/*` and authenticated pages.
3. On `fetch` failure for document navigations, redirect to **`/offline`**.
4. Ship behind a flag env `PWA_SERVICE_WORKER_ENABLED=1` and test doctor/admin sessions thoroughly.

Until then, **`/offline` is manual/bookmark only** for users.
