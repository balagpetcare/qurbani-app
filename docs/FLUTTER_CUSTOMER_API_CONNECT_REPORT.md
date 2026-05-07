# Flutter customer flow — API connection report

**Date:** 2026-05-07  
**Scope:** Customer area list + treatment (lead) request against the existing Next.js public APIs.

## Customer APIs connected

| Flutter | HTTP | Backend |
|--------|------|---------|
| `AreasRepository.fetchAreas()` | `GET /api/areas` | `src/app/api/areas` — JSON `{ "areas": [...] }` |
| `PublicLeadsRepository.submitLead(body)` | `POST /api/leads` | `src/app/api/leads/route.ts` + `parsePublicLeadIntake` |

No doctor-only fields are requested or displayed in this flow. Optional `mediaUrls` are only sent when the user enters valid `http`/`https` URLs; rules mirror `parseMediaUrlsField` in `src/lib/public-lead-intake.ts` (max 5, max 2048 chars per URL).

## Payload used (`POST /api/leads`)

Built by `mobile_flutter/lib/data/customer_lead_payload.dart` — `buildCustomerLeadSubmitBody`.

| JSON field | When set | Notes |
|------------|----------|--------|
| `customerName` | always | trimmed |
| `phone` | always | canonical `01[3-9]XXXXXXXX` from `normalizeBangladeshPhone` |
| `serviceRequirement` | always | problem description |
| `animalKind` | always | `CATTLE` \| `GOAT` \| `SHEEP` \| `BUFFALO` \| `OTHER` |
| `animalTypeOther` | if `animalKind == OTHER` | required in UI when OTHER |
| `areaId` | list area chosen | integer; omitted for “অন্যান্য” |
| `customArea` | “অন্যান্য” | trimmed; omitted when `areaId` set |
| `whatsapp` | optional | same canonical format if provided |
| `address` | optional | |
| `preferredContact` | optional | `CALL` \| `WHATSAPP` \| `VISIT` (uppercased) |
| `mediaUrls` | optional | string array, max 5 |
| `priority` | always | `NORMAL` |
| `source` | always | `mobile_app` |
| `landingPath` | always | `/mobile/customer/request` |

**Mutual exclusion:** Either `areaId` (>0) or `customArea`, not both — matches server validation.

**Display-only query params:** `/customer/request?areaId=&areaName=` — `areaName` is for the form header only; the server receives `areaId` only.

## Flutter UX implemented

- **Area picker:** `GET /api/areas`, search over `slug`, `name`, `nameBn`, `nameEn`, pull-to-refresh, retry on error, “অন্যান্য এলাকা” when list empty or not listed.
- **Treatment form:** validation copy in Bengali, BD phone normalization, optional WhatsApp, optional `preferredContact`, optional `mediaUrls` (line-separated), submit `CircularProgressIndicator`, `ApiException` / generic error `showBengaliAlert`, success → `/customer/request-success?leadId=`.
- **Offline / network:** `ApiException.fromDio` Bengali messages (including connection errors).

## Parity with web

Web public lead form continues to post to the same route with the same core fields. Mobile adds `source: mobile_app` and `landingPath: /mobile/customer/request` for attribution; server accepts optional `source` / `landingPath` per existing intake parsing.

## Files touched (this work)

- `mobile_flutter/lib/features/customer/area_selection_screen.dart`
- `mobile_flutter/lib/features/customer/treatment_request_screen.dart`
- `mobile_flutter/lib/data/customer_lead_payload.dart` (new, if not already present)
- `mobile_flutter/lib/core/validation/lead_media_urls.dart` (new, if not already present)
- `mobile_flutter/lib/data/models/area_model.dart` / `public_leads_repository.dart` (small robustness fixes if present)
- `mobile_flutter/test/customer_lead_payload_test.dart`
- `mobile_flutter/test/lead_media_urls_test.dart`
- `mobile_flutter/test/phone_normalize_test.dart` (existing — covers `01…`, `+880…`, `880…`, and `1…` local)

## Validation commands (run locally)

```bash
cd mobile_flutter
flutter pub get
flutter analyze
flutter test
```

Next.js backend was **not** modified for this task; no `npm run lint` / `build` required here.

## Manual test steps

1. Set `AppConfig.apiBaseUrl` (via `assets/env/app.env`) to a running Quurbani site with public lead form enabled.
2. Open app → Customer home → “এলাকা” / area flow → confirm list loads; pull to refresh; turn off network → error + retry.
3. Use search; pick an area → form shows Bengali area label; submit with valid `01` / `+880` / `880` phone → success screen with id.
4. Choose “অন্যান্য এলাকা”, enter custom area name, submit → `customArea` only (no `areaId`).
5. Invalid phone → Bengali validation alert.
6. Enter 6 `https` lines in media field → Bengali limit error; enter one valid `https` URL → submit succeeds if server accepts.

---

**NEXT COMMAND TO RUN:** Command 4 — Connect Doctor Login and Leads APIs
