# Quurbani 2026 — Bangladesh phone / WhatsApp normalization (2026)

## Summary

Phone and WhatsApp values are normalized to a single **canonical local** format for PostgreSQL storage: **`01[3-9]XXXXXXXX`** (11 digits). Inputs may use spaces, `+`, `880`, `00880`, or national `1XXXXXXXXX`; all are accepted when they represent a valid Bangladesh mobile operator range.

**WhatsApp (`wa.me`)** uses **international digits without `+`**: `880` + national mobile without leading `0` → e.g. `01701022274` → `8801701022274`.

## Changed files

| Area | File |
|------|------|
| Core helpers | `src/lib/phone.ts` |
| Public lead API | `src/app/api/leads/route.ts` |
| Doctor application API | `src/app/api/doctor-applications/route.ts` |
| Admin doctors API | `src/app/api/admin/doctors/route.ts`, `src/app/api/admin/doctors/[id]/route.ts` |
| Admin lead API | `src/app/api/admin/leads/[id]/route.ts` |
| Assign doctor + notification | `src/app/api/admin/leads/[id]/assign-doctor/route.ts` |
| Convert application | `src/app/api/admin/doctor-applications/[id]/convert/route.ts` |
| Login (phone lookup) | `src/app/api/admin/login/route.ts`, `src/app/api/doctor/login/route.ts` |
| Tel links | `src/app/admin/leads/[id]/page.tsx`, `src/app/doctor/leads/page.tsx`, `src/app/doctor/leads/[id]/page.tsx` |
| Forms (error mapping) | `src/components/landing/LeadForm.tsx`, `src/components/landing/DoctorApplicationForm.tsx` |
| DB migration | `prisma/migrations/20260505193000_canonical_bd_mobile_local/migration.sql` |

## Normalization rules (`normalizeBangladeshPhone`)

1. Strip everything except digits (`\D` removed).
2. Repeatedly strip a leading `00` (international prefix / `00880…`).
3. If **13 digits** starting with **`880`**, treat as `880` + national mobile `1[3-9]XXXXXXXX`; canonical form is **`0` + national part**.
4. If **11 digits** starting with **`01`**, validate against **`/^01[3-9]\d{8}$/`**.
5. If **10 digits** starting with **`1`**, prepend **`0`** and validate as above.
6. Otherwise return **`null`**.

Exported helpers:

- `validateBangladeshPhone(input)` — boolean.
- `phoneToWhatsAppNumber(input)` — `880…` digits for `wa.me`, or `null`.
- `bangladeshTelHref(input)` — `tel:+880…` for valid numbers.
- `bangladeshPhoneDatabaseVariants(local)` — `[local, 880…]` for duplicate checks against legacy rows before full migration.

User-visible validation messages (API + forms):

- `BD_PHONE_INVALID_MSG_BN` — `সঠিক বাংলাদেশি ফোন নম্বর দিন।`
- `BD_WHATSAPP_INVALID_MSG_BN` — `সঠিক বাংলাদেশি WhatsApp নম্বর দিন।`

## Expected normalization examples

| Input | Canonical stored |
|--------|-------------------|
| `01701022274` | `01701022274` |
| `1701022274` | `01701022274` |
| `8801701022274` | `01701022274` |
| `+8801701022274` | `01701022274` |
| `+88 01701022274` | `01701022274` |
| `008801701022274` | `01701022274` |
| `01 7010 22274` | `01701022274` |
| `+880 1701 022274` | `01701022274` |

## Invalid examples

| Input | Reason |
|--------|--------|
| `12345` | Too short / wrong shape |
| `8801200000000` | Operator digit must be `3–9` after `01` |
| `019999` | Too short |
| `abcd01701022274` | Digits do not form a valid BD mobile after stripping |

## Manual test checklist

No automated unit-test runner is configured in this project (`package.json` has no `test` script). Use this checklist after `npx prisma migrate deploy` (or `migrate dev`) so existing `880…` rows match login and duplicates.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Lead form: phone `+880 1701 022274`, submit | 201/redirect; DB `Lead.phone` = `01701022274` |
| 2 | Doctor apply: phone `008801701022274` | Success; stored canonical local |
| 3 | Admin → edit doctor: phone `1701022274`, WhatsApp `+88 01701022274` | Save OK; both normalized |
| 4 | Doctor login with `+8801701022274` | Success if user exists with same logical number |
| 5 | Admin login with phone (if configured) | Same as above |
| 6 | Open lead detail / doctor lead: **কল** link | `tel:+8801701022274` style |
| 7 | WhatsApp button | `https://wa.me/8801701022274` |

## Command results

Run from repo root:

```bash
npm run lint
npm run typecheck
npm run build
```

Results from the last validation run on this branch:

| Command | Result |
|---------|--------|
| `npm run lint` | Exit code 0 |
| `npm run typecheck` | Exit code 0 |
| `npm run build` | Exit code 0 (Next.js 16.2.4) |

Build log includes an existing Next.js notice: middleware → proxy deprecation warning (unrelated to this change).

After pulling: apply migration (`npx prisma migrate deploy`) before relying on login duplicate matching against old `880…` rows.

## Notes

- **Notifications**: New queued WhatsApp notifications use `phoneToWhatsAppNumber` on the doctor contact so `recipientPhone` stays in **international digit** form (`880…`). Existing `Notification` rows are not rewritten by the migration.
- **Landing constants**: `LANDING_SUPPORT_DIGITS` may remain in international form; `phoneToWhatsAppNumber` and `formatPhoneForDisplay` accept both.
