# Public case history MVP — implementation report

**Date:** 2026-05-07  
**Plan reference:** `docs/TUTORIAL_CASE_HISTORY_IMPLEMENTATION_PLAN.md`  
**Flutter patterns:** `docs/FLUTTER_TUTORIAL_FEED_REPORT.md` (feed, detail, report, rate limits)

## Summary

- **Database:** `PublicCaseHistory` (and `PublicCaseHistoryStatus`) already existed from migration `20260515100000_public_case_history_mvp`; no new Prisma migration in this change set.
- **Privacy:** Public mobile DTOs expose only anonymized clinical/area fields and **doctor display name**. `sourceLeadId` / `sourceCaseReportId` are **never** returned from public APIs. Customer name, phone, WhatsApp, full address, and map URLs are not part of public DTOs. Text fields are validated server-side for likely phone/email patterns before accept/publish.
- **Doctor flow:** After case completion with `publicShowcaseEligible`, doctor may `POST /api/mobile/doctor/case-histories/from-lead/[leadId]` (billing doctor, completed `LeadCaseReport`). Payload creates/updates a **PENDING_APPROVAL** row.
- **Admin:** `/admin/moderation/case-histories` lists pending items; approve publishes (optional JSON overrides on approve); reject stores Bengali/English reason like tutorials.
- **Public read:** `GET /api/mobile/case-histories` and `GET /api/mobile/case-histories/[id]` — **PUBLISHED** only; optional Bearer applies **user block** filter on author doctor. IP rate limits mirror tutorials.
- **Reports:** `POST /api/mobile/content-reports` accepts `targetType: PUBLIC_CASE_HISTORY` for **published** rows only.
- **Flutter:** Feed + detail screens, Bengali UI, pull-to-refresh, loading/empty/error, report dialog; doctor lead detail shows status and **submit public case history** when eligible.

## HTTP APIs (new / updated)

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/mobile/case-histories` | Published list; `skip`/`take` |
| `GET` | `/api/mobile/case-histories/[id]` | Published detail; 404 if blocked author |
| `POST` | `/api/mobile/doctor/case-histories/from-lead/[leadId]` | Doctor Bearer; completed + showcase eligible |
| `GET` | `/api/admin/moderation/case-histories` | Admin/staff; `?status=` optional |
| `POST` | `/api/admin/moderation/case-histories/[id]/approve` | Optional body edits + publish |
| `POST` | `/api/admin/moderation/case-histories/[id]/reject` | `{ reasonBn }` or `{ reason }` |
| `POST` | `/api/mobile/content-reports` | **Updated:** `PUBLIC_CASE_HISTORY` + `TUTORIAL` |
| `GET` | `/api/doctor/leads/[id]` | **Updated:** `publicCaseHistory` + `caseReport` minimal flags |

## Key files

**Backend**

- `src/lib/case-history-validation.ts` — area bucket vocabulary, PII heuristics, media URL parsing
- `src/lib/case-history-public-dto.ts` — public card/detail DTOs
- `src/lib/case-history-from-lead.ts` — doctor submit parsing from lead + case report + JSON overrides
- `src/lib/public-rate-limit.ts` — `assertPublicCaseHistoryReadAllowed`, `assertDoctorCaseHistoryWriteAllowed`
- `src/app/api/mobile/case-histories/**`
- `src/app/api/mobile/doctor/case-histories/from-lead/[leadId]/route.ts`
- `src/app/api/admin/moderation/case-histories/**`
- `src/app/api/mobile/content-reports/route.ts`
- `src/app/api/doctor/leads/[id]/route.ts`
- `src/app/admin/(shell)/moderation/case-histories/page.tsx`
- `src/components/admin/AdminCaseHistoryModerationControls.tsx`
- `src/app/admin/(shell)/more/page.tsx` — link to case history moderation

**Flutter**

- `lib/data/case_history_models.dart`, `lib/data/case_histories_repository.dart`
- `lib/features/case_history/*` (feed, detail, card, report dialog)
- `lib/data/doctor_repository.dart` — `publicCaseHistory` on lead detail + submit API
- `lib/features/doctor/doctor_lead_detail_screen.dart`
- `lib/app/app_scope.dart`, `lib/router/app_router.dart`
- Removed `lib/features/case_history/case_history_placeholder_screen.dart`

## Validation (agent)

**qurbani-app**

- `npx prisma generate` — OK  
- `npx prisma validate` — OK  
- `npm run lint` — OK  
- `npm run typecheck` — OK  
- `npm run build` — OK  

**mobile_flutter**

- `flutter pub get` — OK  
- `flutter analyze` — OK (deprecated `DropdownButtonFormField.value` suppressed with project-consistent ignore, matching tutorial report dialog)

---

**NEXT COMMAND TO RUN:** Command 14 - Social Login Plan and Implementation
