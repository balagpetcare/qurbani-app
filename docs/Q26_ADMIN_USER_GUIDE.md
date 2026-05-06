# Quarbani 2026 — Admin user guide

**Audience:** Operators with **ADMIN** or **STAFF** portal access (cookie session; same login UI).  
**Canonical lead list:** `/admin/requests` (not legacy `/admin/leads`, which redirects).

---

## 1. Signing in

1. Open **`/admin/login`**.
2. Enter email + password (seeded admin from `prisma/seed.ts` + `ADMIN_SEED_PASSWORD`, or credentials your team set).
3. After login, you land on **`/admin`**.

**Logout:** use link to **`/api/admin/logout`** (or any logout control shown in UI).

---

## 2. Lead queue (requests)

- **Path:** `/admin/requests`
- **Sorting:** Higher **priority** (e.g. emergency) appears above others; within the same priority, **newest first**.
- **Filters:** Use the filter form (search, status, doctor, area, dates, etc.).
- **Open a lead:** **View** → `/admin/leads/[id]`

### On lead detail

- Read customer, animal, service requirement, priority, map link (if any).
- **Notes:** add internal notes.
- **Status:** change lifecycle status where allowed.
- **Assign doctor:** pick an active doctor; they receive assignment (queued WhatsApp row if number present + in-app notification). Unassign returns eligible leads toward **NEW** when appropriate.
- **Case report (after completion):** When the doctor completes a case, **diagnosis**, **treatment**, follow-up flags, and optional **public showcase** fields appear here — review showcase text for **no customer PII** before relying on public display.

---

## 3. Doctors

- **List:** `/admin/doctors`
- **New:** `/admin/doctors/new` — create user with role **DOCTOR**, phone, optional WhatsApp.
- **Edit:** `/admin/doctors/[id]/edit` — update profile, **active** toggle, and **service areas** (`DoctorArea`).  
  **Important:** A doctor only sees **assigned** leads plus **unassigned** leads whose **lead area** is in their coverage.

---

## 4. Doctor applications

- **List:** `/admin/doctor-applications`
- **Detail:** `/admin/doctor-applications/[id]` — review notes, adjust areas, set status (reviewed / approved / rejected).
- **Convert to doctor user:** use the convert flow when approved (creates `User` + `DoctorArea` from selected areas — follow on-screen/API flow).

---

## 5. Notifications

- **Path:** `/admin/notifications`  
- Shows queued **IN_APP** and **WHATSAPP** (etc.) rows — **delivery to real devices is not automatic** until a provider is integrated.

---

## 6. Reports

- **Path:** `/admin/reports` — doctor performance / lead stats (scoped to implemented metrics).

---

## 7. Operational tips

- Prefer **HTTPS** in production so auth cookies behave correctly.
- After schema deploy, run **`npx prisma migrate deploy`** then verify login.
- For duplicate leads, the UI may show a **Duplicate** hint when the system flagged a recent same-phone submission.

---

## 8. Support / engineering

- Auth implementation: `src/lib/auth-token.ts`, `src/middleware.ts`, `src/lib/auth-guards.ts`
- Lead search helpers: `src/lib/admin-leads-search.ts`
- Routes reference: `docs/Q26_NEXT_STAGE_MASTER_PLAN.md` §2.6–2.7
