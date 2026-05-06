# Doctor apply page — existing-account login option (2026-05-06)

## Existing doctor login route

- **Path:** `/doctor/login` (`src/app/doctor/login/page.tsx` + `DoctorLoginClient.tsx`)
- **Not used:** `/login?role=doctor` (no such route in this app)
- **Post-login redirect:** The client reads the **`from`** query parameter (not `next`). It must be a same-origin path: starts with `/` and not `//`. If missing or invalid, it falls back to **`/doctor/leads`**.

## UI on `/doctor/apply`

1. **Top (always):** A bordered card above the main content with:
   - Heading: *ইতোমধ্যে অ্যাকাউন্ট আছে?*
   - Body: *আপনি যদি আগে থেকেই ডাক্তার অ্যাকাউন্ট পেয়ে থাকেন, তাহলে এখান থেকে লগইন করুন।*
   - Primary action: **ডাক্তার লগইন করুন** → `/doctor/login?from=/doctor`
2. **Bottom (when application form is open):** A separated block with a short *ইতোমধ্যে নিবন্ধিত?* line and a text-style link to the same URL (for long forms on mobile).

**Design notes**

- Login uses a **dark (zinc) solid button** so it is not confused with the application form’s **emerald** submit button.
- Touch targets use **min-height ≥ 44–48px**; card is visually separate from the application form.

## Redirect behavior

- Link: **`/doctor/login?from=/doctor`**
- After successful login, `DoctorLoginClient` `router.replace("/doctor")` (when `from` is valid), matching the app’s doctor dashboard entry.

## Security / scope

- `/doctor/apply` remains public (already exempt in `middleware.ts`).
- No new auth logic, no admin changes, no Prisma changes, no changes to doctor application `POST` behavior.

## Changed files

| File | Change |
|------|--------|
| `src/app/doctor/apply/page.tsx` | Login callout + bottom link; `DOCTOR_LOGIN_HREF` constant |
| `docs/DOCTOR_APPLY_LOGIN_OPTION_2026-05-06.md` | This document |

## Verification

Commands (local run, exit code 0):

- `npm run lint` — pass  
- `npm run typecheck` — pass  
- `npm run build` — pass (Next.js 16.2.4; middleware deprecation notice only)

## Manual QA

- [ ] Open `/doctor/apply` — top card and login button visible on mobile
- [ ] Click **ডাক্তার লগইন করুন** — lands on `/doctor/login?from=/doctor`
- [ ] After login — redirects to `/doctor`
- [ ] Submit doctor application — still works unchanged
- [ ] When applications disabled — top login card still visible; amber “ফর্ম বন্ধ” below
