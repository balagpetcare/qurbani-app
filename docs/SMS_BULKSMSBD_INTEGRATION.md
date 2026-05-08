# BulkSMSBD SMS integration (Quarbani 2026)

This document describes server-side SMS via **BulkSMSBD** for OTP, lead tracking, customer updates, and doctor/admin alerts.

## Required environment variables

Set these only in server secrets / `.env` (never in Flutter or Next.js client bundles):

| Variable | Purpose |
|----------|---------|
| `BULKSMSBD_API_KEY` | Provider API key |
| `BULKSMSBD_SENDER_ID` | Approved sender ID |
| `BULKSMSBD_BASE_URL` | Default `http://bulksmsbd.net/api` |
| `SMS_ENABLED` | Set to `true` to allow outbound SMS (transactional + OTP when combined with credentials) |
| `SMS_DRY_RUN` | Set to `true` to log SMS as skipped without calling the provider |
| `SMS_BRAND_NAME` | Brand string in OTP English template (default `Quarbani 2026`) |
| `PUBLIC_APP_URL` | Public site origin for tracking links (e.g. `https://qurbani.balagpetclinic.com`) |
| `ADMIN_SMS_ALERT_PHONE` | Optional BD mobile for admin new-lead SMS |

Legacy compatibility:

- `SMS_OTP_ENABLED=1` still allows **OTP** SMS when `SMS_ENABLED` is not `true` (Twilio variables are no longer used for OTP).

## How OTP works

1. Client calls `POST /api/mobile/otp/start` (aliases: `POST /api/auth/otp/send`) with `{ "phone": "…" }`.
2. Server stores **bcrypt hash** of a 6-digit OTP in `CustomerOtpChallenge`; TTL **5 minutes**.
3. SMS body (English, provider-friendly): `Your {SMS_BRAND_NAME} OTP is {code}`.
4. Verify: `POST /api/mobile/otp/verify` or `POST /api/auth/otp/verify` with `phone`, `challengeId`, `code`.
5. On success, the same HMAC session token as existing customer login is issued.

Rate limits (in addition to in-memory IP limits):

- Max **3** OTP sends per phone per **15 minutes**
- Minimum **60 seconds** between sends from the same phone

## Lead tracking SMS

On successful `POST /api/leads`, the API returns `trackingCode`, `trackingUrl`, and `smsStatus` (`sent` | `failed` | `skipped`).

Public tracking page: `/track/{trackingCode}` (legacy `?leadId=` still supported).

Customer SMS (Bengali):

> Quarbani 2026: আপনার চিকিৎসা রিকোয়েস্ট গ্রহণ করা হয়েছে। ট্র্যাক করুন: {url}

SMS failure does **not** roll back lead creation.

## Doctor / admin SMS

- **New lead (area match):** SMS to doctors with `notifySms` and an overlapping `DoctorArea`, plus optional `ADMIN_SMS_ALERT_PHONE`. Messages avoid customer phone numbers and clinical detail.
- **Doctor accepted case:** customer receives acceptance + tracking link.
- **Status changes:** customer notified for important statuses (assigned, accepted, in progress, completed, follow-up needed, cancelled).

## Testing with `SMS_DRY_RUN`

1. Set `SMS_DRY_RUN=true` and valid-looking env keys (or rely on skip paths).
2. No HTTP request is made to BulkSMSBD; `SmsLog` rows end as `SKIPPED` with reason `dry_run`.
3. Combine with `MOBILE_OTP_DEV_REVEAL=1` only on non-production stacks if you need plaintext OTP in JSON.

## Production enablement

1. Set real `BULKSMSBD_*` secrets on the host.
2. Set `SMS_ENABLED=true`.
3. Set `SMS_DRY_RUN=false`.
4. Set `PUBLIC_APP_URL` to the live HTTPS origin.
5. Whitelist the server outbound IP at BulkSMSBD if required (`1032` = IP not whitelisted).
6. Ensure SMS balance (`1007` = insufficient balance).

## Provider response codes (subset)

| Code | Meaning |
|------|---------|
| 202 | Submitted successfully |
| 1007 | Insufficient balance |
| 1032 | IP not whitelisted |

See `src/lib/server/sms/bulksmsbd.ts` for the full mapping used in logs and admin responses.

## Security

- **Never** put `BULKSMSBD_API_KEY` in Flutter, public JavaScript, or `NEXT_PUBLIC_*` variables.
- Do not return raw OTP or provider echo bodies to clients; API responses use Bengali `messageBn` only.
- Production logs must not contain full OTPs, full API keys, or full phone numbers (server uses masked / redacted previews in `SmsLog` for OTP).

## Production checklist

- [ ] New API key issued and stored in host secrets only  
- [ ] Sender ID approved in BulkSMSBD  
- [ ] Server IP whitelisted if your account requires it  
- [ ] Positive SMS balance  
- [ ] `SMS_DRY_RUN=false`  
- [ ] `PUBLIC_APP_URL` matches the public site  
- [ ] `SMS_ENABLED=true`  

## Admin

Main admin settings page shows SMS enabled/dry-run flags and a **balance check** button calling `GET /api/admin/sms/balance` (session required). API keys are never displayed.
