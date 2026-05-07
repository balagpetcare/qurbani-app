# Flutter + Next.js — mobile media upload foundation

**Date:** 2026-05-07  
**Scope:** Customer lead request attachments (images / short MP4), validation, preview, and **optional** Vercel Blob upload — **no** tutorial feed, **no** unrestricted formats, **no** DB binary storage.

## Media foundation status

### Flutter (`mobile_flutter`)

- **Image picker** (gallery) and **video picker** (`ImagePicker.pickVideo`, max duration 5 minutes) on the treatment request screen.
- **Client validation:** MIME allowlist + size caps (`lead_media_limits.dart`, `lead_media_validator.dart`) — Bengali errors.
- **Preview:** local `Image.file` while uploading; `Image.network` / video icon after URL is returned.
- **Permissions:** `ensureLeadMediaGalleryPermission()` runs **only** when the user taps **ছবি** or **ভিডিও** (`lead_media_permissions.dart`). No microphone flow.
- **URLs on submit:** Uploaded CDN URLs are merged **before** pasted links, capped at **5** total (`mergeUploadedAndManualMediaUrls` in `lead_media_urls.dart`). Pasted links still go through `parseLeadMediaUrlsOrThrow` (http/https only).
- **Repository:** `MobileMediaRepository` — `requestUploadUrl` + multipart `ingestMultipart` via `ApiClient.postMultipartAbsolute`.

### Next.js (`qurbani-app`)

- **`POST /api/mobile/media/upload-url`** — Validates `contentType` / optional `byteSize`, rate-limits per IP. If `BLOB_READ_WRITE_TOKEN` is **unset**, returns `{ available: false, messageBn, allowedMimeTypes, … }` (**no fake upload URL**). If set, returns `{ available: true, method: "POST", uploadUrl, uploadIntent, … }` for the follow-up ingest call.
- **`POST /api/mobile/media/ingest`** — Multipart field `file`; requires header **`X-Qurbani-Upload-Intent`** (HMAC signed with `SESSION_SECRET`, short TTL). Server re-checks size/type, then **`put`** to Vercel Blob (`@vercel/blob`) with pathname prefix `mobile/leads/{yyyy}/{mm}/…` (`src/lib/mobile-lead-media.ts`).
- **No large blobs in Postgres** — only public `https://…` URLs are stored on the lead JSON (existing `mediaUrls` field).

## Upload endpoint status

| Endpoint | Role |
|----------|------|
| `POST /api/mobile/media/upload-url` | Policy + signed **intent** token + ingest URL |
| `POST /api/mobile/media/ingest` | Actual bytes → Blob → returns `{ url }` |

**Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `video/mp4` only.  
**Max size:** 8 MiB images, 20 MiB video (constants in `mobile-lead-media.ts` / Flutter mirror).  
**Rate limit:** `assertMobileMediaUploadAllowed` — env `PUBLIC_MEDIA_UPLOAD_RATE_IP_*` (see `.env.example`).

## Files changed (summary)

**Next.js:** `src/lib/mobile-lead-media.ts`, `src/lib/mobile-upload-intent.ts`, `src/lib/public-rate-limit.ts`, `src/app/api/mobile/media/upload-url/route.ts`, `src/app/api/mobile/media/ingest/route.ts`, `package.json` / lockfile (`@vercel/blob`), `.env.example`.

**Flutter:** `lib/core/network/api_client.dart`, `lib/core/media/*`, `lib/core/validation/lead_media_urls.dart`, `lib/data/mobile_media_repository.dart`, `lib/features/customer/widgets/customer_lead_media_section.dart`, `lib/features/customer/treatment_request_screen.dart`, `lib/app/app_scope.dart`, `test/lead_media_urls_test.dart`, `test/lead_media_validator_test.dart`.

**Docs:** `docs/FLUTTER_MEDIA_FOUNDATION_REPORT.md` (this file).

## Validation (run locally)

```bash
cd mobile_flutter && flutter pub get && flutter analyze && flutter test
cd ../qurbani-app && npm run lint && npm run typecheck && npm run build
```

**Last run:** `flutter analyze` — no issues; `flutter test` — 20 passed. Next.js lint, typecheck, and build succeeded when the API routes were added (re-run after backend edits).

## Manual test steps

1. **Without** `BLOB_READ_WRITE_TOKEN`: open customer request → **ছবি** → pick image → expect Bengali “upload not configured” and **no** URL added to the lead payload.
2. **With** token (Vercel Blob store): same flow → upload succeeds → URL appears in preview and is included on submit; lead row shows `mediaUrls` in admin as today.
3. Oversize / wrong type file → Bengali validation **before** network (client) or 400 from server.
4. Add external `https` links in the text field + uploads → total capped at **5**.

---

**NEXT COMMAND TO RUN:** Command 8 — Customer OTP and My Requests
