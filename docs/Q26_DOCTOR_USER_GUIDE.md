# Quarbani 2026 — Doctor user guide

**Audience:** Field veterinarians with **DOCTOR** role.  
**Login:** `/doctor/login`  
**Logout:** `/api/doctor/logout`

---

## 1. What you can see

The app shows a lead if **either**:

- It is **assigned to you**, or  
- It is **unassigned** (**NEW**) and the lead’s **area** is one of your **covered areas** (set by admin on your profile).

You **cannot** open other doctors’ assigned leads from another area; you will be redirected with a **restriction** message if you try a direct URL.

---

## 2. Dashboard

- **Path:** `/doctor`
- Shows counts for **your visible** leads, including **active emergency** highlights when applicable.
- Links to **all leads** and **emergency tab** on the list page.

---

## 3. Lead list

- **Path:** `/doctor/leads`
- **Tabs / filters:** e.g. mine, pool, emergency, completed — use the in-page controls.
- **Mobile:** Each card has large **Call**, **WhatsApp**, optional **Map** (if customer left a Google Maps URL), and **Details**.

---

## 4. Lead detail & workflow

- **Path:** `/doctor/leads/[id]`
- **Top actions:** Back to list, **Call**, **WhatsApp**, **Google Map** (if URL present).
- **Status:** Use the workflow controls to move through **accept**, **start treatment**, **observed**, etc., as enabled for the current state.
- **Accept case:** **Accept** assigns you when the lead is in the pool in your area, or confirms assignment when admin already assigned you.
- **Observations:** Add visit notes when applicable.
- **Complete case:** Fill **diagnosis** and **treatment** (required). Optional follow-up date if follow-up is needed.
- **Public showcase (optional):** If you mark the case for public showcase, write **title + summary without customer name, phone, or exact address** — that text may appear on the public landing for community education.

---

## 5. Applying to join the network

- **Path:** `/doctor/apply` (public form; no login required to apply).
- Use valid Bangladesh phone formats; admin reviews applications separately.

---

## 6. Practical tips

- **Emergency leads** are visually highlighted; treat them with priority.
- If the customer chose **emergency** on the form, the landing copy also reminds them to **call or WhatsApp** directly.
- Keep **Google Maps** links in leads as customers provide them; tap **মানচিত্র** / **গুগল মানচিত্র** to open in Maps.

---

## 7. Support / engineering

- Visibility rules: `src/lib/doctor-lead-access.ts`
- APIs under `/api/doctor/*`
- Overview: `docs/Q26_NEXT_STAGE_MASTER_PLAN.md` §2.8–2.9
