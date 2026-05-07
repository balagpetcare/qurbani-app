# Flutter doctor flow — API connection report

**Date:** 2026-05-07  
**Scope:** Doctor mobile login, secure token storage, authenticated doctor APIs, session expiry, lead list/detail/accept, privacy, logout.

## Doctor auth connected

| Step | Implementation |
|------|----------------|
| Login | `POST /api/mobile/doctor/login` with JSON `{ "identifier", "password" }` via `DoctorRepository.loginMobileAccessToken` (`lib/data/doctor_repository.dart`). |
| Response | Reads `accessToken` (Bearer JWT). Server also sets httpOnly cookie for web parity; mobile relies on JSON token only. |
| Secure storage | `AuthSession.setDoctorToken` → `SecureTokenStore.writeDoctorToken` (`lib/core/storage/secure_token_store.dart`). |
| Hydrate | `AuthSession.hydrate()` on startup reads token into memory. |
| Authorization | `ApiClient` request interceptor adds `Authorization: Bearer <token>` when `authSession.doctorToken` is non-empty (`lib/core/network/api_client.dart`). |

UI: `DoctorAuthScreen` (`lib/features/auth/doctor_auth_screen.dart`) — loading state and Bengali errors via `ApiException`.

## Doctor lead APIs connected

| API | Repository method |
|-----|-------------------|
| `GET /api/doctor/me` | `DoctorRepository.fetchMe()` |
| `GET /api/doctor/leads?tab=&page=` | `DoctorRepository.fetchLeads` |
| `GET /api/doctor/leads/[id]` | `DoctorRepository.fetchLeadDetail` → `{ lead, contactVisible }` |
| `POST /api/doctor/leads/[id]/accept` | `DoctorRepository.acceptLead` |
| `POST /api/doctor/logout` | `DoctorRepository.logoutRemote()` (best-effort; clears cookie server-side for web session parity) |

**Pull-to-refresh:** `DoctorLeadsListScreen` and `DoctorDashboardScreen` use `RefreshScroll`; lead detail uses pull-to-refresh to reload `me` + lead.

## Privacy behavior confirmed

Aligned with `src/lib/lead-privacy.ts` and `GET /api/doctor/leads/[id]/route.ts`:

- **`contactVisible`** is `true` only when `assignedDoctorId ===` current doctor (`canDoctorViewLeadCustomerContact`).
- When **`contactVisible` is `false`**, the API omits `phone`, `whatsapp`, `address`, etc., clears notes/observations that may contain PII, and redacts `assignedDoctor` to `{ id, name }` only.
- **Flutter UI** (`DoctorLeadDetailScreen`): if `contactVisible` is false, shows Bengali explanation plus **masked** lines (`০১** **** ** (লক করা)`); **does not** fabricate real digits. When true, shows values returned by the API only.
- **Lead list** rows come from `buildDoctorLeadListRow` — includes `customerName` and problem summary for workflow; no raw phone/WhatsApp in list payload.

## 401 and 409 handling

- **401:** `ApiClient` runs `onUnauthorized` (wired to `authSession.logoutDoctor()` in `app_scope.dart`) only when the response is 401, the request carried an `Authorization` header, and the path is **not** a doctor login route. Then throws `ApiException` with Bengali session copy. `AuthSession.notifyListeners` + `GoRouter` `refreshListenable` redirect protected routes to `/auth/doctor`.
- **409 (accept conflict):** Server returns `{ "error": "কেসটি ইতিমধ্যে অন্য ডাক্তার নিয়েছেন" }`. UI uses title **কেস ইতিমধ্যে নেওয়া হয়েছে** and reloads lead detail after dialog.

## Logout

`DoctorSettingsTabScreen`: `logoutRemote()` then `auth.logoutDoctor()` — clears secure storage and memory, then navigates to `/auth/doctor`.

## Files changed (this command)

- `mobile_flutter/lib/core/network/api_client.dart` — `onUnauthorized`, await before throw, 401 copy, login path + header guards  
- `mobile_flutter/lib/app/app_scope.dart` — wire `onUnauthorized: () => authSession.logoutDoctor()`  
- `mobile_flutter/lib/features/doctor/doctor_lead_detail_screen.dart` — privacy copy + masked lines, 409 dialog, `RefreshScroll`, safe `id` parsing  
- `mobile_flutter/lib/features/doctor/doctor_leads_list_screen.dart` — `context.read` before await in `_load`  
- `mobile_flutter/lib/features/doctor/doctor_dashboard_screen.dart` — same `_load` pattern  
- `mobile_flutter/lib/data/models/doctor_lead_list_row.dart` — JSON `id` as `int` or `num`  
- `mobile_flutter/test/doctor_lead_list_row_test.dart` — new  
- `qurbani-app/docs/FLUTTER_DOCTOR_API_CONNECT_REPORT.md` — this file  

**Next.js:** unchanged (no `npm run lint` / `build` required for this task).

## Validation (run locally)

```bash
cd mobile_flutter
flutter pub get
flutter analyze
flutter test
```

## Manual test steps

1. Configure `assets/env/app.env` with a valid `API_BASE_URL`.  
2. **Login:** `/auth/doctor` → valid doctor credentials → lands on dashboard; kill app and reopen → still logged in if token persisted.  
3. **Leads:** Open লিড tab → list loads; **pull to refresh**; switch tabs (all / mine / pool).  
4. Open a lead → **pull to refresh** on detail; if pool/unassigned, confirm **masked** phone lines and explanation; **accept** → full contact appears when API sets you as assignee.  
5. **409:** Two doctors on same pool lead (or simulate race) → second accept shows Bengali conflict dialog.  
6. **401:** Invalidate token server-side or use expired JWT → next doctor API call clears session and **redirects to doctor login**.  
7. **Logout:** Settings → লগআউট → token cleared, login screen.

---

**NEXT COMMAND TO RUN:** Command 5 — Doctor Treatment Completion
