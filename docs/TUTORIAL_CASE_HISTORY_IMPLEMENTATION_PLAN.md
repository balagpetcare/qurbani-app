# Tutorial, Video, Engagement, Moderation & Public Case History — Implementation Plan

**Date:** 2026-05-07  
**Status:** Planning only — **no code changes** in this document.  
**Sources:** `docs/FLUTTER_APP_FULL_BREAKDOWN_PLAN.md`, `docs/FLUTTER_PUSH_NOTIFICATION_FOUNDATION_REPORT.md`, existing Prisma (`Lead`, `LeadCaseReport`, `User`, `PushDeviceToken`, mobile media routes).

This plan defines **data models**, **APIs**, **privacy/moderation/video rules**, **Flutter and admin UI**, **store risks**, and a **recommended build order**. It aligns with current patterns: HMAC Bearer auth (`DOCTOR` / `CUSTOMER`), signed blob uploads for lead media, FCM device tokens, and admin-only moderation on the web.

---

## 1. Database models

### 1.1 Core enums (suggested)

| Enum | Values (concept) |
|------|-------------------|
| `TutorialStatus` | `DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `REJECTED`, `UNPUBLISHED` (admin takedown), `ARCHIVED` |
| `PublicCaseHistoryStatus` | `DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `REJECTED`, `UNPUBLISHED` |
| `ModerationTargetType` | `TUTORIAL`, `TUTORIAL_COMMENT`, `PUBLIC_CASE_HISTORY`, `PUBLIC_CASE_COMMENT`, `USER_PROFILE` (future) |
| `ContentReportStatus` | `OPEN`, `REVIEWING`, `RESOLVED_DISMISSED`, `RESOLVED_ACTION_TAKEN` |
| `ContentReportReason` | `SPAM`, `HARASSMENT`, `MISINFORMATION`, `COPYRIGHT`, `OTHER` |
| `ShareChannel` | `NATIVE_SHEET`, `LINK_COPY`, `WHATSAPP`, `OTHER` (analytics only; no auto-post) |

### 1.2 `Tutorial` (canonical row per logical post)

One stable `id` for URLs, engagement FKs, and moderation. Revisions hold mutable content.

| Field | Notes |
|-------|--------|
| `id` | PK |
| `authorUserId` | `User` with role `DOCTOR`; must match active doctor |
| `status` | `TutorialStatus` |
| `currentRevisionId` | Nullable FK to active **published** or latest **draft** revision (pick one invariant in implementation) |
| `submittedAt` | When moved to `PENDING_APPROVAL` |
| `publishedAt` | When `PUBLISHED` |
| `rejectedAt` / `rejectionReason` | Admin feedback to author (Bengali + optional English) |
| `likeCount`, `commentCount`, `shareCount` | Denormalized counters updated in transactions or async jobs |
| `createdAt`, `updatedAt` | Standard |

**Indexes:** `(status, publishedAt DESC)`, `(authorUserId, status)`.

### 1.3 `TutorialRevision` (recommended **yes**)

Doctor edits create new revisions; admin approves a specific revision. Avoids overwriting history and simplifies diff/revert.

| Field | Notes |
|-------|--------|
| `id` | PK |
| `tutorialId` | FK |
| `revisionNumber` | Monotonic int per tutorial |
| `titleBn`, `summaryBn` | Short text for cards |
| `bodyBn` | Long description (Markdown subset or plain text — decide in MVP) |
| `videoUrl` | HTTPS CDN URL only (same pattern as `Lead.mediaUrls` — **no** DB binaries) |
| `posterImageUrl` | Thumbnail URL |
| `durationSec` | Optional; from transcode metadata |
| `mimeType`, `byteSize` | As validated at ingest |
| `statusSnapshot` | Optional copy of tutorial status at submit time |
| `createdByUserId`, `createdAt` | Audit |

**Invariant:** Public feed only joins revision rows that are **approved** and linked to `Tutorial.status = PUBLISHED`.

### 1.4 `TutorialModeration` (optional **thin** table vs overloading `Tutorial`)

**Option A (MVP):** No separate table — use `Tutorial.status`, `rejectedAt`, `rejectionReason`, and `adminReviewedByUserId` on `Tutorial` or latest `TutorialRevision`.

**Option B (audit-heavy):** `TutorialModeration` rows: `id`, `tutorialId`, `revisionId`, `action` (`SUBMIT`, `APPROVE`, `REJECT`, `UNPUBLISH`), `adminUserId`, `note`, `createdAt`.

**Recommendation:** Start **Option A** for MVP; add **Option B** when compliance needs immutable audit trail.

### 1.5 `TutorialLike`

| Field | Notes |
|-------|--------|
| `id` | PK |
| `tutorialId` | FK |
| `userId` | Authenticated user (`DOCTOR` or `CUSTOMER`); document policy if guests allowed (default: **no**) |
| `createdAt` | |
| `@@unique([tutorialId, userId])` | Idempotent like |

### 1.6 `TutorialComment`

| Field | Notes |
|-------|--------|
| `id` | PK |
| `tutorialId` | FK |
| `authorUserId` | |
| `body` | Text; max length; Bengali |
| `status` | `VISIBLE`, `PENDING_MODERATION`, `HIDDEN`, `REMOVED` — see §4 |
| `parentCommentId` | Nullable for threading (Phase 2; MVP flat) |
| `createdAt`, `updatedAt` | |

### 1.7 `TutorialShareEvent` (analytics, not “shares count” only)

| Field | Notes |
|-------|--------|
| `id` | PK |
| `tutorialId` | FK |
| `actorUserId` | Nullable if anonymous share logging forbidden — default **required** auth |
| `channel` | `ShareChannel` |
| `clientMeta` | JSON: app version, platform (optional) |
| `createdAt` | |

Rate-limit per user/IP to prevent spam table growth.

### 1.8 `ContentReport`

| Field | Notes |
|-------|--------|
| `id` | PK |
| `reporterUserId` | |
| `targetType` | `ModerationTargetType` |
| `targetId` | Polymorphic id (tutorial id, comment id, case history id) |
| `reason` | Enum + optional `details` text |
| `status` | `ContentReportStatus` |
| `assignedAdminUserId` | Nullable |
| `resolutionNote` | Internal |
| `createdAt`, `updatedAt` | |

### 1.9 `UserBlock`

| Field | Notes |
|-------|--------|
| `id` | PK |
| `blockerUserId` | |
| `blockedUserId` | |
| `createdAt` | |
| `@@unique([blockerUserId, blockedUserId])` | |

**Semantics:** Blocker never sees blocked user’s tutorials/comments in feeds; server filters joins. Block does not notify blocked user (privacy).

### 1.10 `PublicCaseHistory` (anonymized showcase — separate from `LeadCaseReport`)

Do **not** expose `Lead` phone/address through this table’s API shape. Store **only** fields safe for public.

| Field | Notes |
|-------|--------|
| `id` | PK |
| `sourceLeadId` | Internal FK; **never** returned in public JSON |
| `sourceCaseReportId` | Optional FK to `LeadCaseReport` for staff traceability |
| `authorDoctorUserId` | Display “ডাক্তার” + verified badge; optional `displayDoctorName` if policy allows real doctor name on public feed (product decision; default **show doctor display name only**, never customer) |
| `status` | `PublicCaseHistoryStatus` |
| `titleBn`, `summaryBn`, `bodyBn` | Admin-approved copy; may differ from doctor draft |
| `animalKind` | Enum or text bucket |
| `areaBucket` | Coarse label only (e.g. zone or “ঢাকা — উত্তর”) — **not** full address |
| `mediaUrls` | JSON text URLs only (images / short clip) |
| `posterImageUrl` | |
| `submittedAt`, `publishedAt`, `rejectedAt`, `rejectionReason` | |
| `likeCount`, `commentCount`, `shareCount` | Optional engagement same as tutorials |
| `createdAt`, `updatedAt` | |

**Optional:** `PublicCaseHistoryRevision` mirroring tutorials if edit/re-approval flow is needed.

### 1.11 Engagement on case history (optional MVP scope)

If comments on case history are in MVP, add `CaseHistoryComment` (same moderation states as `TutorialComment`) or reuse a generic `ContentComment` with `(targetType, targetId)` — **recommend separate table** for simpler queries and indexes.

### 1.12 Relationship to existing models

- **`LeadCaseReport`:** Doctor proposes showcase from completed case; server copies **sanitized** fields into `PublicCaseHistory` draft; **no** auto-publish.
- **`Lead` / `LeadCaseBilling`:** Internal billing stays private; public case history does not duplicate fees in MVP unless product wants “indicative range” only.

---

## 2. API endpoints

Convention: **Public** reads use `GET` under `/api/...` or `/api/mobile/...` without secrets; **writes** require Bearer. Rate-limit all public lists and engagement writes (reuse / extend `public-rate-limit.ts`).

### 2.1 Public — approved tutorial feed

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/mobile/tutorials` or `/api/tutorials` | None or optional customer | Cursor pagination; only `PUBLISHED`; returns card DTO: id, titleBn, summaryBn, posterImageUrl, durationSec, likeCount, commentCount, publishedAt, doctorDisplayName (policy). |
| `GET` | `/api/mobile/tutorials/[id]` | Optional | Detail + video URL + body; **404** if not published or blocked-by-author for viewer. |

### 2.2 Doctor — tutorial draft CRUD & submit

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/mobile/doctor/tutorials` | `DOCTOR` |
| `GET` | `/api/mobile/doctor/tutorials` | `DOCTOR` — own drafts + pending + rejected |
| `GET` | `/api/mobile/doctor/tutorials/[id]` | `DOCTOR` — owner |
| `PATCH` | `/api/mobile/doctor/tutorials/[id]` | `DOCTOR` — only while `DRAFT` or `REJECTED` |
| `POST` | `/api/mobile/doctor/tutorials/[id]/revisions` | `DOCTOR` — new revision (metadata + URLs after upload) |
| `POST` | `/api/mobile/doctor/tutorials/[id]/submit` | `DOCTOR` — sets `PENDING_APPROVAL` |

### 2.3 Admin — approve / reject tutorial

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/admin/moderation/tutorials` | `ADMIN`/`STAFF` |
| `POST` | `/api/admin/moderation/tutorials/[id]/approve` | Admin — attach `revisionId` |
| `POST` | `/api/admin/moderation/tutorials/[id]/reject` | Admin — reasonBn |
| `POST` | `/api/admin/moderation/tutorials/[id]/unpublish` | Takedown |

### 2.4 Engagement — like / unlike

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/mobile/tutorials/[id]/like` | `DOCTOR` or `CUSTOMER` |
| `DELETE` | `/api/mobile/tutorials/[id]/like` | Same |

Transactional counter update or periodic reconcile job.

### 2.5 Engagement — comment

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/mobile/tutorials/[id]/comments` | Public read of **VISIBLE** only (or empty until moderation on — see §4) |
| `POST` | `/api/mobile/tutorials/[id]/comments` | Authenticated |

### 2.6 Engagement — share event

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/mobile/tutorials/[id]/share` | Authenticated — body `{ channel }` |

### 2.7 Report / block

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/mobile/content-reports` | Authenticated — `{ targetType, targetId, reason, details? }` |
| `POST` | `/api/mobile/user-blocks` | Authenticated — `{ blockedUserId }` |
| `DELETE` | `/api/mobile/user-blocks/[blockedUserId]` | Unblock |

### 2.8 Public case history feed

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/mobile/case-histories` | None — published only; anonymized DTO |
| `GET` | `/api/mobile/case-histories/[id]` | None — same |

### 2.9 Doctor — submit case history from completed case

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/mobile/doctor/case-histories/from-lead/[leadId]` | `DOCTOR` — only if lead completed + doctor was billing doctor; body proposes **draft** public fields; server strips PII |

### 2.10 Admin — case history moderation

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/admin/moderation/case-histories` | Admin |
| `POST` | `/api/admin/moderation/case-histories/[id]/approve` | Admin — may edit final copy |
| `POST` | `/api/admin/moderation/case-histories/[id]/reject` | Admin |

### 2.11 Video / media upload (tutorials)

Reuse and **extend** the existing signed-upload pattern (`POST /api/mobile/media/upload-url` + ingest) with **separate path prefix** and limits, e.g. `mobile/tutorials/{yyyy}/{mm}/` and stricter MIME/size for video. New intent type or `contentKind: tutorial` in signed payload to prevent cross-use of lead intents.

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/mobile/media/upload-url` (extended) or `/api/mobile/tutorial-media/upload-url` | Dedicated route cleaner for policies |

---

## 3. Privacy rules (hard requirements)

| Data | Rule |
|------|------|
| Customer phone | **Never** in public tutorial or case history API DTOs; never in `TutorialRevision` / `PublicCaseHistory` public fields. |
| WhatsApp | **Never** exposed on public modules. |
| Full address | **Never**; at most **service area zone** or coarse `areaBucket` chosen from controlled vocabulary. |
| Customer name | **Never** on public case history; tutorials must not reference identifiable customer stories without consent workflow (default: **prohibit** identifiable narratives in MVP). |
| Map URLs | Strip or block if they embed lat/lng that resolves to property; prefer no map in public UGC MVP. |
| Doctor identity | Public feed may show **doctor display name** only (from profile fields already public on landing); do not expose personal phone/email in UGC APIs. |
| Internal IDs | `sourceLeadId` never in public JSON; use opaque public `slug` or numeric id that only maps to public row. |

**Anonymization checklist for `PublicCaseHistory`:** Admin (or automated helper) must verify copy contains no phone patterns, no 11-digit BD numbers, no email, no “গ্রাহকের নাম”, no exact address. Optional: regex scanner + human review queue.

---

## 4. Moderation rules

| Rule | Implementation note |
|------|---------------------|
| All doctor tutorial posts require admin approval | `PENDING_APPROVAL` → only admin can set `PUBLISHED`. |
| All public case history requires admin approval | Same state machine on `PublicCaseHistory`. |
| Report/block before public comments “go live” | **MVP strict:** `TutorialComment.status = PENDING_MODERATION` until first release flag `UGC_COMMENTS_LIVE` is false globally; **Phase 2:** per-user trust after N approved comments. Product pick: default **first comment always pending** + admin queue. |
| Block enforcement | All list/detail queries filter `WHERE author NOT IN (blockedIds)` for viewer. |
| Repeat abuse | Strike counter on `User` (optional) or derive from `ContentReport` counts; auto-hide content after threshold (Phase 2). |

Push notifications (`PushNotificationKind.MODERATION_RESULT`) can notify doctor when tutorial/case history approved or rejected — wire after FCM Admin send exists.

---

## 5. Video rules

| Topic | Plan |
|-------|------|
| Signed upload | Same HMAC intent pattern as lead media: short-lived intent, **dedicated** path prefix `mobile/tutorials/…`, server re-validates MIME/size on ingest. |
| Max file size | Tutorial video **≤** lead video cap or stricter (e.g. 50–100 MB); document env vars per content class. |
| MIME allowlist | Start with `video/mp4` only; images `jpeg/png/webp` for poster; HEIC optional for poster only if transcoded server-side. |
| Thumbnail | **Required** for feed cards: generate server-side (ffmpeg thumbnail at t=1s) **or** doctor uploads poster image (simpler MVP); store second URL. |
| Compression / transcoding | **Phase 1:** Accept MP4 H.264 + AAC baseline; reject exotic codecs in ingest. **Phase 2:** Async job queue (e.g. BullMQ / Cloud Run) → transcoded renditions (720p/480p) + HLS manifest on CDN; `TutorialRevision` gains `playbackUrl`, `transcodeStatus`. |
| Streaming | MVP: progressive `video_player` URL; later: `chewie` + HLS if transcoding. |
| Storage | Vercel Blob or S3-compatible; **no** large objects in Postgres. |

---

## 6. Flutter screens

| Screen | Purpose |
|--------|---------|
| Tutorial feed | Replaces placeholder tab; infinite scroll; empty/offline states; respect blocks. |
| Tutorial detail | Title, body, video player, like button, comments list, report; share via share sheet + `POST .../share`. |
| Doctor tutorial list | Drafts / pending / rejected / published (own). |
| Doctor tutorial editor | Title/summary/body, pick video + poster, upload via signed URLs, submit for approval. |
| Comments | Sub-screen or bottom sheet; Bengali validation; show pending state. |
| Report / block | Modal: reason enum + details; block from user profile chip on comment. |
| Public case history feed | Card list anonymized; no PII. |
| Case history detail | Read-only story + optional image carousel; doctor attribution per policy. |
| Doctor “propose case history” | From completed lead flow: form pre-filled from internal case report fields but **stripped** before save as draft. |

**Navigation:** Customer shell already has tutorials tab placeholder — wire routes under `/customer/tutorials`, `/customer/tutorials/:id`, etc.

---

## 7. Admin web screens (Next.js)

| Screen | Functions |
|--------|-----------|
| Moderation → Tutorials queue | List `PENDING_APPROVAL`; preview video/poster; approve/reject with reason; unpublish published. |
| Moderation → Case histories queue | Same for `PublicCaseHistory`. |
| Reports inbox | `ContentReport` list by severity/age; link to target; resolve actions. |
| User safety | View blocks (support); optional strike summary (Phase 2). |
| Settings / feature flags | `UGC_COMMENTS_LIVE`, max upload MB, allowed MIME list. |

All under existing `/admin` shell with role guards (`ADMIN`/`STAFF`).

---

## 8. Store compliance risks

| Risk | Mitigation |
|------|------------|
| UGC without moderation story | App Store / Play require clear reporting + human review path; ship **admin approval** + report UI **before** scaling traffic. |
| Health misinformation (livestock) | Disclaimers (“সাধারণ শিক্ষামূলক, জরুরি ক্ষেত্রে ভেটেরিনারি পরামর্শ”); optional vet review badge (future). |
| Copyrighted video/music | Terms prohibit unlicensed media; MD5/perceptual hash optional later; DMCA process in policy. |
| Child safety / interaction | If comments exist: block/report + age rating; consider disabling DMs entirely (current plan has no DMs). |
| Data minimization | Public APIs return minimal DTO; logs mask tokens and phone. |
| Push spam | Throttle notifications per `PushDeviceKind`; only meaningful events (moderation result, not every like). |
| Regional law | Bangladesh focus; host privacy policy in Bengali + English. |

---

## 9. Implementation sequence (recommended)

Phases minimize rework and keep production safe.

| Phase | Scope | Deliverables |
|-------|--------|----------------|
| **A — Schema & admin skeleton** | Prisma models + migrations; admin list pages read-only; no public writes | DB ready; admin can see empty queues |
| **B — Tutorial backend MVP** | Doctor draft CRUD + revision + submit; admin approve/reject; `GET` public published list/detail | Matches “Command 11” |
| **C — Signed tutorial media** | Dedicated upload-url/ingest or extended intent; poster required; MP4 allowlist | Doctor can attach video safely |
| **D — Engagement MVP** | Like + share event + comments (pending-first per §4) | Mobile engagement APIs |
| **E — Report & block** | `ContentReport` + `UserBlock` APIs + filter queries | Safety minimum |
| **F — Public case history** | `PublicCaseHistory` + doctor submit from lead + admin approve + public GET | Customer case tab |
| **G — Flutter customer UI** | Feed, detail, report; doctor upload flow | End-user value |
| **H — Flutter doctor UI** | Tutorial management from doctor shell | |
| **I — Video pipeline v2** | Transcode queue, HLS, richer player | Scale & UX |
| **J — Notifications** | FCM payload for `MODERATION_RESULT` + tutorial “new reply” (optional) | Uses existing `PushDeviceToken` |

**Dependency notes:** Phase **C** can parallel **B** if API contracts frozen. **E** should land before or with **D** if comments ship. **F** can reuse moderation UI patterns from **B**.

---

## Document control

| Version | Date | Author |
|---------|------|--------|
| 1.0 | 2026-05-07 | Planning agent |

---

**NEXT COMMAND TO RUN:** Command 11 — Implement Tutorial Backend and Moderation MVP
