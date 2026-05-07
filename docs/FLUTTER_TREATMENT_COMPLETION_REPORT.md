# Flutter — doctor treatment completion

**Date:** 2026-05-07  
**Endpoint:** `POST /api/doctor/leads/[id]/complete` (`src/app/api/doctor/leads/[id]/complete/route.ts`)  
**Web reference:** `DoctorTreatmentBillingForm.submitComplete` in `src/components/doctor/DoctorTreatmentBillingForm.tsx`

## Treatment complete flow implemented

- New route: **`/doctor/case/:lid/complete`** → `DoctorTreatmentCompleteScreen` (`lib/features/doctor/doctor_treatment_complete_screen.dart`).
- From lead detail, **চিকিৎসা সমাপ্তি ও বিল** appears only when `assignedDoctorId ==` current doctor and `status` is **`IN_PROGRESS`** or **`OBSERVED`** (same gate as server `CAN_COMPLETE_FROM`).
- After successful submit: **success view** (invoice + new status) and **লিডে ফিরে যান** pops `true` so detail runs **`_load()`** again (and user can pull-to-refresh the leads list separately).

## Payload used

Built by **`buildDoctorCompletePayload`** (`lib/data/doctor_complete_payload.dart`). Field names and semantics match the web `fetch` body:

| Field | Notes |
|--------|--------|
| `treatmentCompletionStatus` | `COMPLETED` \| `FOLLOW_UP_NEEDED` \| `REFERRED` \| `CANCELLED` |
| `diagnosis` | required, min 2 chars (client + server) |
| `treatmentNote` | required (maps to case “treatment given”), min 2 |
| `medicinesUsed` | optional; omitted when empty |
| `doctorNote` | optional; omitted when empty |
| `observation` | optional; omitted when empty |
| `serviceFee`, `medicineCharge`, `transportCharge`, `emergencyCharge`, `otherCharge`, `discountAmount`, `totalCollected` | non-negative integers (server-required; **0 allowed**, same as web defaults) |
| `paymentMethod` | Prisma enum string: `CASH`, `BKASH`, … |
| `followUpRequired` | boolean; server uses `followUpRequested \|\| status == FOLLOW_UP_NEEDED` — payload sets **`followUpRequired`** to that effective value |
| `nextFollowUpAt` | ISO-8601 string or JSON `null` |
| `publicShowcaseEligible` | boolean |
| `showcaseTitle`, `showcaseSummary` | optional; if showcase on, client enforces summary length ≥ 10 (server rule) |
| `platformCommissionRatePercent` | **omitted** in mobile payload so the server applies the site default (`getBillingPlatformCommissionRatePercent`), same as omitting on web when not sent |

Billing fields are **not invented**: they are required by the existing API; the UI documents that zeros are valid and mirrors the web form.

## UX

- Bengali validation for diagnosis/treatment length, follow-up date, integer amounts, discount vs sum of charges, showcase text.
- **Submitting:** button shows a progress indicator.
- **Errors:** `ApiException` → `showBengaliAlert`.
- **Success:** dedicated success scaffold; pop refreshes lead detail.

## Files changed

- `mobile_flutter/lib/data/doctor_complete_payload.dart` (new)
- `mobile_flutter/lib/data/doctor_repository.dart` — `completeTreatment`
- `mobile_flutter/lib/features/doctor/doctor_treatment_complete_screen.dart` (new)
- `mobile_flutter/lib/features/doctor/doctor_lead_detail_screen.dart` — open complete route; refresh on return
- `mobile_flutter/lib/router/app_router.dart` — register `/doctor/case/:lid/complete` **before** `/doctor/case/:lid`
- `mobile_flutter/test/doctor_complete_payload_test.dart` (new)
- `qurbani-app/docs/FLUTTER_TREATMENT_COMPLETION_REPORT.md` (this file)

**Next.js:** unchanged.

## Validation (local)

```bash
cd mobile_flutter
flutter pub get
flutter analyze
flutter test
```

## Manual test steps

1. Doctor logged in; lead **assigned to you** in **`IN_PROGRESS`** or **`OBSERVED`** (start treatment from web if needed).
2. Open lead in app → **চিকিৎসা সমাপ্তি ও বিল** → fill diagnosis + treatment + billing (zeros OK) + payment method.
3. Submit → success shows **invoice** and **leadStatus**; return → detail **status updated**; open leads list and **pull to refresh** to see new status.
4. Try **follow-up** toggle or **ফলোআপ প্রয়োজন** status without date → Bengali validation.
5. Wrong state (e.g. `NEW`) → complete button hidden; direct URL still gets server `400` with Bengali message.

---

**NEXT COMMAND TO RUN:** Command 6 — Mobile Config, Legal Pages and Store Readiness Foundation
