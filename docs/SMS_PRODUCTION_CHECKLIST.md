# SMS production checklist (BulkSMSBD — lead intake)

Use this after deploy (PM2 / Docker / VPS) to confirm the veterinary lead SMS path is healthy. **Never** paste API keys or full phone numbers into tickets.

## 1. Environment

- [ ] `SMS_ENABLED=true` for production sends (or `SMS_OTP_ENABLED=1` **only** if you intentionally want OTP-only legacy behaviour).
- [ ] `SMS_DRY_RUN` is **unset** or `false` in production.
- [ ] `SMS_API_KEY` (or `BULKSMSBD_API_KEY`) and `SMS_SENDER_ID` (or `BULKSMSBD_SENDER_ID`) are set on the **runtime** host (PM2 ecosystem / Docker env / systemd), not only on a dev machine.
- [ ] `SMS_API_URL` optional; if unset, default `http://bulksmsbd.net/api/smsapi` is used.
- [ ] `PUBLIC_APP_URL` or `NEXT_PUBLIC_APP_URL` set to the public site origin (no trailing slash) for tracking/admin links in templates.
- [ ] `OFFICIAL_LEAD_RECEIVE_PHONES` — comma-separated list of office mobiles (880… or local forms accepted). Example: `8801777889994,8801701022274`.
- [ ] `OFFICIAL_LEAD_RECEIVE_PHONE` — optional single fallback; merged with the list above (deduped).
- [ ] `CUSTOMER_SUPPORT_PHONE` — optional; shown in the customer confirmation SMS when set.

## 2. Network / provider

- [ ] Server egress IP is **whitelisted** in BulkSMSBD (required for HTTP API).
- [ ] Quick balance check: `GET /api/admin/sms/balance` from an authenticated admin session, or provider dashboard.
- [ ] Provider returns `response_code` **202** for successful queue (mapped in app logs as success).

## 3. Application behaviour

- [ ] Submit a **non-production** test lead with `SMS_DRY_RUN=true` first — expect `SmsLog` rows with status `SKIPPED` / provider message `SMS_DRY_RUN`; HTTP 201 from `POST /api/leads`.
- [ ] Submit a real test lead with dry-run off — **customer** receives BN + English confirmation including tracking URL when `PUBLIC_APP_URL` is set.
- [ ] **Every** number in `OFFICIAL_LEAD_RECEIVE_PHONES` receives the **English** office alert (masked customer phone, area, admin URL).
- [ ] `POST /api/leads` returns **201** even if SMS fails (check JSON `smsStatus` / `officeSmsStatus` and `SmsLog` for `FAILED`).
- [ ] Calling notify twice for the same lead does **not** duplicate customer/office sends for the same destination (dedupe via `SmsLog` `SENT` + lead + purpose + normalized phone).

## 4. Observability

- [ ] Container / PM2 logs show JSON lines: `sms_attempt`, `sms_result`, `sms_provider_response`, `sms_retry`, `sms_dedupe_skip` (no full MSISDN; tail digits only).
- [ ] Prisma `SmsLog` rows exist for each attempt with `purpose` `lead_customer_intake_confirm` / `lead_office_intake`, `providerCode`, and `providerMessage` where applicable.

## 5. Regression

- [ ] OTP path still works (`POST /api/mobile/otp/start`) if SMS is enabled for OTP.
- [ ] Doctor new-lead SMS (area-based) still fires from lead creation when doctors match `notifySms` + area.

## 6. Rollback

- [ ] Set `SMS_ENABLED=false` and redeploy to stop all non-OTP outbound SMS without touching lead intake.

## Architecture (short)

- `POST /api/leads` → `notifyLeadCreatedSms` → `sendCustomerLeadConfirmation` / `sendOfficeLeadAlert` (`src/lib/sms/send.ts`) → `sendSmsWithRetry` → `sendSms` (`src/lib/server/sms/sms.service.ts`) → BulkSMSBD HTTP form POST (`URLSearchParams`, UTF-8 safe).
- Templates: `src/lib/sms/templates.ts` (customer BN + English line; office English + masked phone).
- Office numbers: `getOfficeLeadNotifyPhones()` in `src/lib/server/sms/sms-env.ts`.
