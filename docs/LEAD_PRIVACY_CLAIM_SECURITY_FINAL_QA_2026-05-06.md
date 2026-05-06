# Lead privacy and claim security — final QA (COMMAND 3/3)

**Date:** 2026-05-06  
**Prior work:** COMMAND 2/3 implementation + `docs/LEAD_PRIVACY_CLAIM_SECURITY_IMPLEMENTATION_2026-05-06.md`

---

## Final privacy rules (as shipped)

| Audience | Customer PII (phone, WhatsApp, address, map URL, free-text `message`) | Doctor PII on cards |
|----------|------------------------------------------------------------------------|---------------------|
| **Public** | Never on marketing/landing/doctor preview; only in applicant’s own form fields (submission) | Never — previews use allowlisted DB fields only; CTAs go to `/request` |
| **Doctor (pool / non-assignee)** | Not in list API/HTML; not in detail HTML; stripped in `GET /api/doctor/leads/[id]` JSON; notes & observations cleared in that JSON | `assignedDoctor` in doctor API is `{ id, name }` only (query no longer loads assignee phone) |
| **Doctor (assignee)** | Full contact in UI + DB-backed page | N/A |
| **Admin / STAFF** | Full on lead detail + admin APIs for single lead; list/dashboard rows omit raw phone | Shown where needed for operations (e.g. assign handoff) |

---

## Final claim flow

1. **Pool:** `Lead.assignedDoctorId == null` and `status == NEW` → doctor may **`POST /api/doctor/leads/[id]/accept`**.  
2. **Atomicity:** Pool branch uses **`updateMany`** with `WHERE id AND assignedDoctorId IS NULL AND status = NEW`**; second doctor gets **409** `কেসটি ইতিমধ্যে অন্য ডাক্তার নিয়েছেন`.  
3. **Already assigned to another doctor:** Transaction now returns **`taken`** (same **409** message) instead of generic **400**, so API and UI errors stay consistent with Case C.  
4. **Admin assign:** Unchanged; doctor accepts with existing “assigned to me + ASSIGNED” path.

---

## Tested routes and surfaces (static verification)

| Surface | Method | Result |
|---------|--------|--------|
| `/` (landing) | Code review + grep | Platform `phoneDigits` / `whatsappDigits` / optional **site** `email` from settings — **not** per-doctor directory; `DoctorPreviewSection` uses `/request` CTAs; `getDoctorPreviews` selects no doctor `phone`/`whatsapp`/`email` |
| `/request` | Code review | Customer intake + platform contact props only |
| `/doctor/apply` | Code review | Applicant form only; no roster of doctors with numbers |
| `/doctor`, `/doctor/leads`, `/doctor/leads/[id]` | Code review | Lists omit PII; detail gates contact; logged-in doctor’s own phone in summary strip is intentional |
| `GET /api/doctor/leads` | Code review | `buildDoctorLeadListRow` — no phone/address/map |
| `GET /api/doctor/leads/[id]` | Code review | `sanitizeDoctorLeadDetailJson` + `contactVisible`; assignee select **id + name only** |
| `POST .../accept` | Code review | Race-safe `updateMany`; explicit **`taken`** for other assignee |
| `POST .../observations`, `.../start-treatment` | Code review | **`doctorCanMutateLeadCase`** (assignee only) |
| `/admin/*` | Code review | Middleware + `requireAdminFromRequest`; lead detail unchanged for admins |

**Manual browser QA** was not executed in this pass; behaviors below are **traceable from code paths**.

---

## Security test cases and results (code-backed)

### Case A — Unclaimed pool lead

| Check | Result |
|-------|--------|
| Doctor can open `/doctor/leads/[id]` if in visibility rules | **Pass** — `doctorCanAccessLead` |
| Contact hidden | **Pass** — `canDoctorViewLeadCustomerContact` false → no Call/WA/address/map UI; API strips fields |
| Claim visible | **Pass** — `DoctorLeadWorkflowPanel` / `DoctorLeadQuickStatus` when `NEW` + unassigned |

### Case B — Current doctor claims

| Check | Result |
|-------|--------|
| Accept succeeds | **Pass** — `updateMany` + history + assignment row |
| Sees contact after assign | **Pass** — `assignedDoctorId === viewer` |
| Treatment / status | **Pass** — existing assignee checks + `doctorCanMutateLeadCase` on observations/start |

### Case C — Another doctor, same lead already claimed

| Check | Result |
|-------|--------|
| Opens detail (area pool) | **Pass** — still visible for triage summary |
| Contact hidden | **Pass** |
| Claim API | **Pass** — **`taken`** → **409** `কেসটি ইতিমধ্যে অন্য ডাক্তার নিয়েছেন` (COMMAND 3 hardening) |
| Claim UI | **Pass** — quick actions hidden when not `NEW`/unassigned or not mine on ASSIGNED; workflow shows no accept for other’s lead |

### Case D — Admin

| Check | Result |
|-------|--------|
| Full customer contact | **Pass** — `/admin/leads/[id]` unchanged |
| Claimed doctor + time | **Pass** — assignment section + `LeadAssignment` `assignedAt` when `unassignedAt` null |
| Release / reassign | **Pass** — `AssignDoctorForm` + `PATCH .../assign-doctor` |

### Public — no doctor MSISDN/email on cards

| Check | Result |
|-------|--------|
| `getDoctorPreviews` | **Pass** — explicit `select` allowlist |
| Hero/Trust/Sticky | **Pass** — site settings digits, not `User.phone` |

### Direct URL / API

| Check | Result |
|-------|--------|
| Non-doctor hits `/api/doctor/leads/*` | **401** — cookie + `requireDoctorFromRequest` |
| Public hits `/api/leads` POST | Public intake only; no lead listing |
| Doctor not in visibility | **403** on list scope; redirect `restricted=1` on detail page |

---

## Claim race condition

- **Implemented and verified in code:** `updateMany({ where: { id, assignedDoctorId: null, status: NEW }, data: { ... } })` — single winner.  
- **COMMAND 3 addition:** If `assignedDoctorId` is **non-null and not the current user**, respond **`409`** with the same Bengali message as race conflict (clearer than **400** `bad_state`).

---

## Phone / WhatsApp normalization (library review)

`normalizeBangladeshPhone` / `bangladeshTelHref` / `phoneToWhatsAppNumber` in `src/lib/phone.ts`:

| Input style | Expected |
|-------------|----------|
| `01777889994` | Local canonical → `tel:+8801777889994`, WA `8801777889994` |
| `+8801777889994` | After digit handling → valid local |
| `8801777889994` | 13-digit `880` branch |
| Spaces / hyphens | Stripped via `digitsOnly` / `replace` in format helpers |

**Note:** Numbers must match Bangladesh mobile rules (`01[3-9]…`); invalid input falls back to `tel:` best-effort in `bangladeshTelHref` for edge cases.

---

## Mobile UI and hydration

| Topic | Result |
|-------|--------|
| Touch targets | Doctor list/detail and admin patterns use **`min-h-[44px]`–`min-h-[52px]`** on primary actions (existing + preserved) |
| Horizontal overflow | **`min-w-0`** added on doctor detail contact button row (**COMMAND 3**); pages use **`min-w-0` / `overflow-x-clip`** on shells where present |
| Bengali wrap | Detail notices and **`break-words`** / **`leading-snug`** on list cells |
| Hydration | **No** `Date.now()` / `Math.random()` under `src/app/doctor` or `src/components/doctor` (grep) |

---

## Final verification commands

| Command | Result |
|---------|--------|
| `npx prisma validate` | OK |
| `npx prisma generate` | OK |
| `npm run lint` | OK |
| `npm run typecheck` | OK |
| `npm run build` | OK |

---

## Remaining limitations

1. **`problemSummary` / truncated `serviceRequirement`** may still echo digits or landmarks typed by the customer in free text — not a substitute for full PII scrubbing in narrative fields.  
2. **`GET /api/doctor/leads/[id]`** returns `{ lead, contactVisible }` — external clients must respect both.  
3. **Contact-reveal audit** not persisted (see improvements).  
4. **Site-level** phone/WhatsApp on landing remain **platform** numbers (by design), not doctor numbers.

---

## Recommended future improvements

1. **Contact reveal audit log** — append-only table or throttled `logOps` when assignee first loads contact-bearing payload.  
2. **Auto-release timer** — optional SLA to return stuck `ACCEPTED` leads to pool (policy + cron).  
3. **Doctor abuse monitoring** — rate limits on claim attempts, flag repeated **409**s.  
4. **Admin reassignment history UI** — richer readout from `LeadAssignment` + `LeadStatusHistory` (data already largely present).

---

## Files changed in COMMAND 3 (hardening + QA doc)

- `src/app/api/doctor/leads/[id]/accept/route.ts` — explicit **`taken`** → **409** when another doctor holds the lead.  
- `src/app/api/doctor/leads/[id]/route.ts` — **`assignedDoctor`** select reduced to **`id`, `name`** (defense in depth).  
- `src/app/doctor/leads/[id]/page.tsx` — **`min-w-0`** on contact CTA row.  
- `docs/LEAD_PRIVACY_CLAIM_SECURITY_FINAL_QA_2026-05-06.md` — this document.
