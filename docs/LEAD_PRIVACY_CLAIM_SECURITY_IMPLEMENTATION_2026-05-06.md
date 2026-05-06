# Lead privacy and claim security — implementation notes

**Date:** 2026-05-06  
**Related plan:** `docs/LEAD_PRIVACY_CLAIM_SECURITY_PLAN_2026-05-06.md`  
**Command:** COMMAND 2/3 — implementation

---

## Summary

Customer contact fields are **stripped in doctor APIs** and **conditionally rendered** on doctor pages until `Lead.assignedDoctorId` matches the viewing doctor. Public doctor cards use **allowlisted fields only** and CTAs point to **`/request`**. Admin list/dashboard rows no longer show raw customer phone; admin lead detail is unchanged for full PII. **No Prisma migration** was added; “claimed time” for admins uses the active **`LeadAssignment.assignedAt`** row (`unassignedAt: null`).

---

## Changed files (primary)

| Area | Files |
|------|--------|
| Core helpers | `src/lib/lead-privacy.ts` (new) |
| Doctor API | `src/app/api/doctor/leads/route.ts`, `src/app/api/doctor/leads/[id]/route.ts`, `src/app/api/doctor/leads/[id]/observations/route.ts`, `src/app/api/doctor/leads/[id]/start-treatment/route.ts` |
| Admin API | `src/app/api/admin/leads/route.ts` |
| Doctor UI | `src/app/doctor/leads/page.tsx`, `src/app/doctor/leads/[id]/page.tsx` |
| Admin UI | `src/app/admin/requests/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/leads/[id]/page.tsx` |
| Public landing | `src/lib/landing-public-data.ts`, `src/components/landing/DoctorPreviewSection.tsx` |
| Components | `src/components/doctor/DoctorLeadWorkflowPanel.tsx`, `src/components/doctor/DoctorLeadQuickStatus.tsx` |

---

## Database / schema

- **No schema changes.**  
- Claim lock continues to use **`Lead.assignedDoctorId`** and **`POST /api/doctor/leads/[id]/accept`** (atomic `updateMany` for pool claims).  
- Admin “claimed / assigned time” uses **`LeadAssignment`** where `unassignedAt` is null; if no row exists, the UI omits the timestamp line.

---

## Authorization rules implemented

1. **`canDoctorViewLeadCustomerContact(doctorUserId, lead)`** — `true` iff `lead.assignedDoctorId === doctorUserId`.  
2. **`doctorCanMutateLeadCase`** — same predicate; used for **observations** and **start-treatment** (pool doctors can no longer POST these without claiming).  
3. **`sanitizeDoctorLeadDetailJson`** — removes `phone`, `whatsapp`, `address`, `googleMapUrl`, `message`; clears **`notes`** and **`observations`** when the doctor is not the assignee; **redacts `assignedDoctor`** to `{ id, name }` in doctor JSON.  
4. **`buildDoctorLeadListRow` / `buildAdminLeadListRow`** — list DTOs exclude sensitive columns; include **`problemSummary`** (short text).  
5. **Admin/staff** — unchanged route guards; full lead remains on **`GET /api/admin/leads/[id]`** and admin detail page.

---

## Public doctor contact hiding

- **`getDoctorPreviews`** now selects only: `id`, `name`, `notes`, `experienceSummary`, `profilePhotoUrl`, `qualification`, `shortBio`, `doctorAreas`, plus completed-count aggregation. **No** `phone`, `whatsapp`, `email`.  
- **`DoctorPreviewSection`**: shows photo (or initial), qualification, areas, experience blurb, short bio; CTAs **`জরুরি অনুরোধ করুন`** and **`ডাক্তার ডাকুন`** → **`/request`**. Copy states platform handles contact.

---

## Doctor lead claim flow

- **Claim** remains **`POST .../accept`** (pool `NEW` + unassigned → `ACCEPTED`, etc.).  
- UI strings: **`এই কেসটি আমি নিচ্ছি`** in `DoctorLeadWorkflowPanel` and `DoctorLeadQuickStatus` (list quick actions).  
- **Detail page**: pool / unassigned viewers see a **hidden-contact notice** and workflow (claim only until assigned); **assigned-to-other** viewers see **`এই কেসটি অন্য ডাক্তার নিয়েছেন`** and no workflow/contact.  
- **Phone links**: existing **`bangladeshTelHref`** (`tel:+880…`) and **`phoneToWhatsAppNumber`** → `wa.me/880…` when contact is visible.

---

## Admin control flow

- **Assign / release / reassign** unchanged: `AssignDoctorForm` → **`PATCH /api/admin/leads/[id]/assign-doctor`**.  
- Assignment section copy explains **release** (clear doctor in form).  
- **Claimed time** line when an active `LeadAssignment` exists for the current assignee.

---

## Contact reveal audit

- **Not implemented** as a persistent log (would need deduping or a DB table).  
- Existing **`logOps('doctor_lead_accepted', …)`** on successful accept remains.  
- **Future:** optional `ContactRevealLog` or throttled `logOps` on first contact-bearing API response.

---

## Limitations / future improvements

- **`GET /api/doctor/leads/[id]`** response shape is now `{ lead, contactVisible }` — no in-repo client callers found; external API clients must adapt.  
- **Doctor list `problemSummary`** may still reflect free-text service/problem content at a truncated level; stricter redaction would need NLP or admin flags.  
- **`next/image`** for doctor avatars deferred (arbitrary URLs); ESLint disable on `<img>`.

---

## Verification (COMMAND 2/3)

| Command | Result |
|---------|--------|
| `npx prisma validate` | OK |
| `npx prisma generate` | OK |
| `npm run lint` | OK (after `@next/next/no-img-element` disable for doctor photo) |
| `npm run typecheck` | OK |
| `npm run build` | OK |
| `npx prisma migrate dev` | **Not run** — no schema changes |

---