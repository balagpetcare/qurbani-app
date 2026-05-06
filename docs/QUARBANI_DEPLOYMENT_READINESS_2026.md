# Quarbani 2026 — Deployment readiness

**Scope:** `qurbani-app` only (Next.js + Prisma + PostgreSQL). Not BPA/WPA or unrelated products.

This document lists **required configuration**, **commands**, **verification steps**, and **risks** for shipping the lead–doctor–area flow to production.

---

## 1. Required environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | **Yes** | PostgreSQL URL (`src/lib/prisma.ts`, `prisma.config.ts`, seed). App throws if unset. |
| `SESSION_SECRET` | **Yes in production** | HMAC signing for HTTP-only cookie `qurbani_auth` (`src/lib/auth-token.ts`). **Must not** be empty in `NODE_ENV=production`. **Must not** equal the dev placeholder string (see code). Development may omit it (falls back to a known dev-only secret). |
| `ADMIN_SEED_PASSWORD` | **Yes for seed** | bcrypt password for the seeded Main Admin (`prisma/seed.ts`). Seed fails if unset. |
| `ADMIN_SEED_EMAIL` | No | Defaults documented in `prisma/seed.ts` if unset. |
| `ADMIN_SEED_PHONE` | No | Defaults documented in `prisma/seed.ts`; must normalize to Bangladesh mobile if set. |
| `ADMIN_USERNAME` | No | Optional emergency login pair with `ADMIN_PASSWORD` when DB admin has no `passwordHash` (`src/app/api/admin/login/route.ts`). Prefer seed + DB password. |
| `ADMIN_PASSWORD` | No | Same as above. |

**Template:** copy `.env.example` to `.env` locally. Production: configure secrets in the hosting provider (Vercel env, Docker `-e`, Kubernetes secrets, etc.).

---

## 2. Production session secret behavior

- **`NODE_ENV=production`** without `SESSION_SECRET` → **runtime error** when issuing or verifying tokens (login middleware).
- **`SESSION_SECRET` equal to the development placeholder** (`dev-insecure-session-secret`) in production → **runtime error** (deployment safety check in `getSecret()`).
- **Development:** if `SESSION_SECRET` is unset, a fixed dev-only fallback is used — **never rely on this in production.**

---

## 3. Build commands

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

**Last verification run (repo check):** `lint`, `typecheck`, and `build` completed successfully.

---

## 4. Database: migrations

```bash
npx prisma migrate deploy
```

Use **`migrate deploy`** in CI/production (applies existing migrations, non-interactive).

**Last verification:** `npx prisma migrate status` reported **Database schema is up to date!** (after drift remediation documented in `docs/QUARBANI_PRISMA_MIGRATION_DRIFT_FIX_2026.md`).

---

## 5. Seed command

```bash
npm run db:seed
```

Requires **`DATABASE_URL`** and **`ADMIN_SEED_PASSWORD`**. Upserts Main Admin + areas (see `prisma/seed.ts`).

**Safety:** Seed uses **upsert** on admin email; bcrypt cost 12. Rotate `ADMIN_SEED_PASSWORD` / admin password after first deploy if the value was ever logged.

---

## 6. First admin login steps

1. Run migrations: `npx prisma migrate deploy`
2. Run seed: `npm run db:seed` (with env vars set)
3. Open **`/admin/login`**
4. Sign in with **`ADMIN_SEED_EMAIL`** (or default from seed) **or** seeded phone, and **`ADMIN_SEED_PASSWORD`**
5. Confirm redirect to **`/admin`** and cookie **HttpOnly** `qurbani_auth` on HTTPS (`secure` in production — `src/lib/auth-token.ts` `authCookieOptions`)

---

## 7. Doctor test account (staging / QA)

Doctors are **not** created by seed (only Main Admin + areas).

1. Log in as **admin**
2. Go to **`/admin/doctors/new`**
3. Create doctor: **email**, **password** (≥8 chars), **≥1 covered area**, phone/WhatsApp optional
4. Sign out → **`/doctor/login`** with that **email + password**
5. Confirm **`/doctor/leads`** only shows leads **assigned to that doctor** or whose **`lead.areaId`** is in **`DoctorArea`** (`src/lib/doctor-lead-access.ts`)

---

## 8. Behavioral verification (code + manual smoke)

| # | Check | Verification |
|---|--------|----------------|
| 1 | Customer lead submit | `POST /api/leads` — public; landing form uses same API |
| 2 | Doctor application submit | `POST /api/doctor-applications` — public |
| 3 | Doctor visibility | `buildDoctorLeadWhere` / `doctorCanAccessLead` restrict by assignment + area (`src/lib/doctor-lead-access.ts`); APIs use these guards |
| 4 | Admin sees all leads | Admin pages use Prisma without doctor-scoped `where` on lead list/detail |
| 5 | Auth cookies | `SESSION_SECRET` signs tokens; roles `ADMIN` / `DOCTOR` in middleware |

Full browser QA remains recommended before production cutover.

---

## 9. Known production risks

| Risk | Mitigation |
|------|------------|
| **Weak or leaked `SESSION_SECRET`** | Rotate secret (invalidates all sessions); use long random value; never commit `.env` |
| **`DATABASE_URL` exposure** | Restrict network; TLS to Postgres (`sslmode=require` where supported) |
| **Seed password in CI logs** | Mask env in pipelines; change admin password after bootstrap |
| **`ADMIN_USERNAME` / `ADMIN_PASSWORD`** | Avoid in prod unless emergency; remove after DB password is set |
| **Migration drift on old DBs** | Follow `docs/QUARBANI_PRISMA_MIGRATION_DRIFT_FIX_2026.md` |
| **Next.js middleware deprecation warning** | Framework notice only; monitor Next.js upgrade path (“proxy” migration) |

---

## 10. Final deployment checklist

- [ ] Set **`DATABASE_URL`**, **`SESSION_SECRET`** (strong, unique), **`NODE_ENV=production`**
- [ ] Run **`npx prisma migrate deploy`**
- [ ] Run **`npm run db:seed`** (or equivalent once) with **`ADMIN_SEED_PASSWORD`**
- [ ] Run **`npm run build`** and deploy artifact / start **`npm run start`**
- [ ] HTTPS enabled (cookies **`secure`** in production)
- [ ] Smoke test: **admin login**, **create doctor**, **doctor login**, **submit lead**, **doctor application**
- [ ] Document ops contact and rotation procedure for **`SESSION_SECRET`** and DB credentials

---

## 11. Exact commands executed (readiness verification pass)

Run before tagging a release:

```bash
npx prisma migrate status
npx prisma generate
npx prisma validate
npm run lint
npm run typecheck
npm run build
```

**Latest pass (CI-local):** all commands exited **0**.

**`npx prisma migrate status` (expected):**

```text
Database schema is up to date!
```

If drift appears, see **`docs/QUARBANI_PRISMA_MIGRATION_DRIFT_FIX_2026.md`** before deploying.

---

**Document version:** 2026 — Quarbani deployment readiness (env, build, migrations, seed, smoke-test guidance).
