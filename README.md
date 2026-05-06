<<<<<<< HEAD
# Qurbani 2026 · Veterinary lead intake

Internal MVP for capturing **Qurbani season veterinary leads** (Bangladesh), routing them through an **admin console**, and exposing a simple **doctor-facing** assigned-leads view.

## Tech stack

- **Framework:** [Next.js](https://nextjs.org) 16 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS 4
- **Database:** PostgreSQL
- **ORM:** Prisma 7 (`DATABASE_URL`, generated client under `src/generated/prisma/` after `prisma generate`)

## Prerequisites

- Node.js 20+ (matches `engines` expectations from toolchain)
- Docker (optional, for local Postgres)

## Local setup

### 1. Database (Docker)

From the project root:

```bash
docker compose up -d
```

Default compose maps Postgres to host port **5434** (see `docker-compose.yml`).

### 2. Install dependencies

```bash
npm install
```

### 3. Environment

Copy `.env.example` to `.env` and adjust:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | Site URL (used where absolute URLs matter) |
| `ADMIN_USERNAME` | MVP admin login username |
| `ADMIN_PASSWORD` | MVP admin login password |

Never commit real secrets; `.env` is gitignored (`.env.example` is committed).

### 4. Prisma — migrate & generate

```bash
npx prisma migrate dev
npx prisma generate
```

(`npm install` does not run `generate` automatically in this repo; run after schema changes or fresh clone.)

### 5. Seed (optional)

Creates a **database** “Main Admin” user row for records / future auth. **Admin UI login still uses `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`**, not this user.

```bash
npm run db:seed
```

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npx prisma migrate dev` | Create/apply migrations (dev) |
| `npx prisma studio` | Database GUI |
| `npm run db:seed` | Run Prisma seed (`prisma/seed.ts`) |
| `npm run db:push` | Push schema without migration files (use with care) |

## Main URLs

| Path | Notes |
|------|--------|
| `/` | Public landing + lead form |
| `/thank-you` | Post-submit thank-you (optional `?leadId=`) |
| `/api/leads` | `POST` — public lead submission (not behind admin auth) |
| `/admin/login` | MVP admin password login |
| `/admin` | Dashboard (protected) |
| `/admin/leads` | Lead list & filters (protected) |
| `/admin/leads/[id]` | Lead detail, status, notes, doctor assignment (protected) |
| `/admin/doctors` | Create/list doctors (protected) |
| `/admin/notifications` | Notification queue (protected; delivery not wired) |
| `/doctor/leads` | Doctor assigned leads (`?doctorId=` for MVP testing; not behind admin cookie) |
| `/api/admin/*` | Admin APIs (protected by middleware + session cookie, except login/logout) |

## MVP features

- **Lead capture:** Bangladesh phone normalization, optional UTM fields, duplicate hints within 24h.
- **Admin:** Cookie-based login (`ADMIN_USERNAME` / `ADMIN_PASSWORD`), dashboard counts, lead filtering, detail view with notes and status changes.
- **Doctors:** Doctor creation; assign doctor on lead; optional WhatsApp handoff link on detail page.
- **Notifications:** DB queue rows on new lead (`IN_APP`) and doctor assign (`WHATSAPP` pending — **no real WhatsApp/SMS send** yet).
- **Doctor portal:** List of leads assigned to `doctorId` (query param until real auth).

## Production notes

- Replace MVP admin cookie auth with a proper solution when ready.
- Set strong `ADMIN_PASSWORD` and HTTPS (`Secure` cookie already tied to `NODE_ENV`).
- Run migrations in CI/deploy: `npx prisma migrate deploy`.

## Clean clone commands

```bash
docker compose up -d
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run dev
```

Run `npx prisma generate` after install if `src/generated/prisma` is missing.

## Test checklist

1. **Landing:** Load `/`, submit lead form with valid BD mobile → redirects to `/thank-you`.
2. **Admin login:** Visit `/admin` → redirects to `/admin/login`; sign in with env credentials → `/admin` dashboard.
3. **Leads:** `/admin/leads` — filters, pagination, dates and phones readable.
4. **Lead detail:** Open a lead — phone formatting, status badge, preferred date, notes, assignment form.
5. **Status / notes:** Change status; add note — persists (API + refresh).
6. **Doctors:** `/admin/doctors` — create doctor; list shows formatted phones.
7. **Assignment:** Assign doctor on lead detail — notification rows in `/admin/notifications`.
8. **Doctor page:** `/doctor/leads` → pick doctor → assigned leads table.
9. **Logout:** **Log out** in admin nav → `/admin/login`; `/admin` blocked until login again.
=======
# qurbani-app
>>>>>>> 4b82e104eb78ec40aefdf7a4b9a65878e77cf521
