# Quarbani 2026 — Public flow guide

**Audience:** Customers and community members using the **marketing / intake** site (no account required for the main flow).

---

## 1. Landing page (`/`)

Sections include: hero, how it works, problem categories, optional doctor previews, **completed case stories** (anonymous or placeholders), **video tips** (external YouTube search links), services, trust, **lead request form**, area coverage, FAQ.

**Mobile:** A **sticky bottom bar** offers **Call**, **WhatsApp**, and **ডাক্তার চান** (scrolls to the lead form).

---

## 2. Requesting help (lead form)

1. Scroll to **“বিনামূল্যে রিকোয়েস্ট করুন”** or tap **ডাক্তার চান** on mobile.
2. Fill **name**, **Bangladesh mobile**, **area** (required dropdown from live areas), and **service / what you need** (required).
3. Choose **priority** (normal / urgent / emergency). If you pick **emergency**, a notice reminds you to **also call or WhatsApp**.
4. Optional: WhatsApp number, animal details, map link, media links, UTM fields are auto-captured from links when present.
5. Submit → you should be redirected to **`/thank-you`**.

**Phone formats accepted (examples):** `017xxxxxxxx`, `+88017xxxxxxxx`, `88017xxxxxxxx` — stored in a standard local format internally.

---

## 3. After submit

- **`/thank-you`** — confirmation message.
- Your request appears in the **admin** queue; staff assign a vet or vets in your area may pick up **unassigned** pool leads.

---

## 4. Privacy & showcase

- The **“সম্পন্ন কেস”** section never shows your **name** or **phone** on the public page.
- Summaries come from **doctor-approved generic text** only. Do not type personal identifiers into the public summary if you are also a staff tester.

---

## 5. Doctor application (join as vet)

- **`/doctor/apply`** — multi-step style form: personal details, areas, optional certificate URL, etc.
- Duplicate active applications with same phone/email are blocked with a Bengali message.

---

## 6. Offline / install

- **`/offline`** — short message if you open it (e.g. bookmarked); full offline support requires a future service worker.
- **Install as app (PWA):** On Android Chrome, “Add to Home screen” may be offered when manifest + HTTPS are configured. Icon is currently a **placeholder SVG** — replace with branded PNGs for best results (see `docs/Q26_ANDROID_CONVERSION_PLAN.md`).

---

## 7. Support line configuration

The hero and sticky bar use the number in **`src/components/landing/constants.ts`** (`LANDING_SUPPORT_DIGITS`). Update this constant (or future env-driven replacement) before production so calls reach your operations team.

---

## 8. Related docs

- QA status: `docs/Q26_NEXT_STAGE_QA_REPORT.md`
- Product / technical inventory: `docs/Q26_NEXT_STAGE_MASTER_PLAN.md`
- Lead/doctor/area rules (deep): `docs/QUARBANI_LEAD_DOCTOR_AREA_FLOW_PLAN_2026.md`
