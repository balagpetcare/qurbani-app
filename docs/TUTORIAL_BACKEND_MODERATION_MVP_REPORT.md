# Tutorial backend & moderation MVP — implementation report

**Date:** 2026-05-07  
**Scope:** Backend + admin moderation per `docs/TUTORIAL_CASE_HISTORY_IMPLEMENTATION_PLAN.md` (MVP Option A: status on `Tutorial`, no separate moderation audit table). Public Flutter UI intentionally minimal.

## Summary

- **Tutorial backend:** Prisma models `Tutorial`, `TutorialRevision`; doctor-only mobile APIs for draft create/update/submit; public read APIs return **only** `PUBLISHED` rows with a current revision. HTTPS-only media URLs enforced in validation.
- **Admin moderation:** Pending queue (`PENDING_APPROVAL`), approve (optional `revisionId` in JSON), reject with `reasonBn` / `reason`; admin UI at `/admin/moderation/tutorials` (linked from **আরও**).
- **Foundation:** `ContentReport` (MVP: `TUTORIAL` targets, `PUBLISHED` only) and `UserBlock` with create/list-by-delete APIs. **No** public tutorial comments in this MVP.
- **Privacy / safety:** Public DTOs expose doctor **display name** only (no phone/email). Unpublished/rejected/pending content returns **404** on public detail; list filters `PUBLISHED` only. Optional Bearer on public feeds excludes tutorials whose author is blocked by the viewer. In-memory rate limits for public reads, doctor writes, reports, and blocks (`src/lib/public-rate-limit.ts`).

## Database

| Object | Purpose |
|--------|---------|
| `TutorialStatus` | `DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `REJECTED` |
| `Tutorial` | Author, status, moderation timestamps, `currentRevisionId`, counters |
| `TutorialRevision` | Localized fields + `videoUrl` / poster / meta |
| `ModerationTargetType`, `ContentReportReason`, `ContentReportStatus` | Reports |
| `ContentReport` | Reporter, polymorphic `targetType` + `targetId`, `details` |
| `UserBlock` | `blockerUserId` + `blockedUserId` unique pair |

Migration: `prisma/migrations/20260514120000_tutorial_moderation_mvp/migration.sql`.

## HTTP APIs

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| `GET` | `/api/mobile/tutorials` | Optional | Published only; IP rate limit; block filter if Bearer |
| `GET` | `/api/mobile/tutorials/[id]` | Optional | 404 if not published or blocked author |
| `GET` | `/api/mobile/doctor/tutorials` | Doctor Bearer/cookie | Own tutorials |
| `POST` | `/api/mobile/doctor/tutorials` | Doctor | Create draft + revision 1 |
| `GET` | `/api/mobile/doctor/tutorials/[id]` | Doctor | Owner |
| `PATCH` | `/api/mobile/doctor/tutorials/[id]` | Doctor | `DRAFT` / `REJECTED` only |
| `POST` | `/api/mobile/doctor/tutorials/[id]/submit` | Doctor | → `PENDING_APPROVAL` |
| `GET` | `/api/admin/moderation/tutorials` | Admin/staff cookie | `?status=` optional |
| `POST` | `/api/admin/moderation/tutorials/[id]/approve` | Admin/staff | JSON body optional `{ revisionId }` |
| `POST` | `/api/admin/moderation/tutorials/[id]/reject` | Admin/staff | JSON `{ reasonBn }` or `{ reason }` |
| `POST` | `/api/mobile/content-reports` | Doctor or customer | `targetType: TUTORIAL`, `targetId`, `reason` enum |
| `POST` | `/api/mobile/user-blocks` | Doctor or customer | `{ blockedUserId }` |
| `DELETE` | `/api/mobile/user-blocks/[blockedUserId]` | Doctor or customer | Unblock |

## Files touched (main)

- `prisma/schema.prisma`, `prisma/migrations/20260514120000_tutorial_moderation_mvp/migration.sql`
- `src/lib/tutorial-validation.ts`, `src/lib/tutorial-public-dto.ts`, `src/lib/tutorial-revision-input.ts`
- `src/lib/public-rate-limit.ts`, `src/lib/mobile-app-user-auth.ts`
- `src/app/api/mobile/tutorials/**`, `src/app/api/mobile/doctor/tutorials/**`
- `src/app/api/admin/moderation/tutorials/**`
- `src/app/api/mobile/content-reports/route.ts`, `src/app/api/mobile/user-blocks/**`
- `src/app/admin/(shell)/moderation/tutorials/page.tsx`, `src/components/admin/AdminTutorialModerationControls.tsx`
- `src/app/admin/(shell)/more/page.tsx`

## Follow-ups (not in MVP)

- Immutable `TutorialModeration` audit log (plan Option B).
- Admin queue for `ContentReport`, staff assignment, resolution states.
- Flutter tutorial feed + video player (**Command 12**).
- Publish-after-upload pipeline hardening (signed URLs, virus scan, transcode).

## Validation commands

Run from repo root:

`npx prisma generate`  
`npx prisma validate`  
`npm run lint`  
`npm run typecheck`  
`npm run build`

**Last run (agent):** `npx prisma validate` OK · `npx prisma generate` OK · `npm run typecheck` OK · `npm run lint` OK · `npm run build` OK (Next.js 16.2.4).

Apply DB: `npx prisma migrate deploy` (or `migrate dev` in development).
