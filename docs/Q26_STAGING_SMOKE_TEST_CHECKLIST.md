# Quarbani 2026 — Staging smoke test checklist

**Use on:** staging URL with **real PostgreSQL**, seeded **areas**, **admin** user, and **HTTPS** (recommended).

**Prep**

- [ ] `npx prisma migrate deploy` completed
- [ ] `npm run db:seed` (or equivalent) run; note **admin email/password**
- [ ] `SESSION_SECRET` and `DATABASE_URL` set on staging
- [ ] `NEXT_PUBLIC_APP_URL` matches staging origin (optional but good for OG/PWA checks)
- [ ] `src/components/landing/constants.ts` — **`LANDING_SUPPORT_DIGITS`** set to a **test** line you control (or production line if this is pre-prod)
- [ ] Android device with **Chrome** (for sticky CTA + A2HS)

**Legend:** Check each box when verified.

---

## A. Admin & doctors setup

1. [ ] Open `/admin/login` — **Admin login** succeeds (ADMIN or STAFF account).
2. [ ] **Create doctor:** `/admin/doctors/new` — save active doctor with phone/WhatsApp.
3. [ ] **Edit doctor area coverage:** `/admin/doctors/[id]/edit` — assign at least **one** `Area` the doctor should cover.

---

## B. Customer leads (public)

4. [ ] **Landing loads:** `/` renders without server error.
5. [ ] **Normal lead:** Submit form with valid **01…** mobile, required fields, **NORMAL** priority → redirects to `/thank-you`.
6. [ ] **Emergency lead:** Submit with **EMERGENCY** priority → thank-you; in admin, notification/type shows emergency treatment (see D).
7. [ ] **Phone variants:** Submit (or API) with same number as `+8801…` and `8801…` — both normalize; no false “invalid” if format is correct.
8. [ ] **Area selection:** Only active areas in dropdown; invalid `areaId` rejected by API.
9. [ ] **Rate limit (optional):** Rapid-fire many submits from same IP — expect **429** and Bengali message (reset window or use another IP to continue).

---

## C. Admin lead queue

10. [ ] Open `/admin/requests` — new lead appears; **emergency** sorts above normal when both exist (priority ordering).
11. [ ] **Lead detail:** Open lead — data matches submission.
12. [ ] **Assign doctor** — assign to doctor from step A; lead shows assigned doctor.

---

## D. Doctor workflow

13. [ ] **Doctor login:** `/doctor/login` with doctor credentials.
14. [ ] **Allowed lead visible:** Assigned lead **or** unassigned lead in doctor’s **area** appears on `/doctor/leads`.
15. [ ] **Unauthorized lead:** Open another area’s assigned lead URL directly — **cannot** access (redirect / restricted message).
16. [ ] **Accept:** Accept lead → status moves appropriately; admin notification queue may show accept event.
17. [ ] **Start treatment / observe** (if required by your workflow) — reach state that allows complete.
18. [ ] **Complete case:** Submit completion with diagnosis + treatment → success.
19. [ ] **Admin sees case report:** Open same lead in admin — **case report** section populated.

---

## E. Doctor applications

20. [ ] **Apply:** `/doctor/apply` — submit new application (unique phone/email vs existing users/apps).
21. [ ] **Admin review:** `/admin/doctor-applications` — open application, set status / notes.
22. [ ] **Convert:** Run **convert to doctor** flow for an approved application (if that is your process) — new doctor can log in and has expected areas.

---

## F. Public showcase & video

23. [ ] **Showcase:** If a completed case marked **public showcase** with summary, landing **সম্পন্ন কেস** shows **no customer name/phone** (only generic summary + area label).
24. [ ] **Video section:** “ভিডিও পরামর্শ” links open externally; disclaimer visible.

---

## G. Mobile / PWA

25. [ ] **Sticky CTA (Android Chrome):** On `/`, bottom bar shows **কল · WhatsApp · ডাক্তার চান**; **ডাক্তার চান** scrolls to form.
26. [ ] **Add to Home Screen:** Install PWA; app opens; **icon** appears (SVG placeholder until PNG assets — see `docs/Q26_PWA_ICON_PNG_TODO.md`).
27. [ ] **Production numbers:** Tap **কল** / **WhatsApp** on landing — `tel:` / `wa.me` use **`LANDING_SUPPORT_DIGITS`** (verify on device).

---

## H. Ops / logs (optional)

28. [ ] In host logs, confirm **JSON** lines for `lead_submitted`, `doctor_application_submitted`, `admin_lead_assigned`, `doctor_lead_accepted`, `doctor_case_completed` during the steps above.
29. [ ] Confirm logs show **masked** phones (`***` + last 4), **not** full numbers.

---

## Failures

If any step fails, capture: URL, user role, request id / timestamp, and log excerpt (redact secrets). File a bug and **do not** promote to production until resolved or waived in writing.
