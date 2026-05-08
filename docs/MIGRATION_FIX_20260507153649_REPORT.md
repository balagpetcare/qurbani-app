# Migration fix: `20260507153649_qurbani_db_lastes`

## Root cause

Migration `20260507153649_qurbani_db_lastes` was generated against a database that already contained tutorial/moderation and public-case tables. On a **fresh** database, those tables are created only in **later** migrations:

| Table | First created in |
|-------|------------------|
| `ContentReport`, `Tutorial`, `TutorialRevision` | `20260514120000_tutorial_moderation_mvp` |
| `PublicCaseHistory` | `20260515100000_public_case_history_mvp` |

The migration therefore failed with `relation "ContentReport" does not exist` (and similarly for `PublicCaseHistory`) when `npx prisma migrate deploy` ran migrations in chronological order.

Additionally, `ALTER TYPE "LeadStatus" ADD VALUE 'FOLLOW_UP_NEEDED'` in this migration is still **semantically required**: `20260506090341` adds the value to the *old* enum, but `20260506200000_qurbani_areas_workflow` drops and recreates `LeadStatus` without `FOLLOW_UP_NEEDED`. The replacement uses `ADD VALUE IF NOT EXISTS` so a fresh chain stays idempotent and safe on PostgreSQL 16+.

The `Lead` → `Area` foreign key change (drop `RESTRICT`, add `SET NULL`) remains in this migration because `Area` and `Lead.areaId` already exist by this point in the history.

## Files changed

1. `prisma/migrations/20260507153649_qurbani_db_lastes/migration.sql`
2. `prisma/migrations/20260514120000_tutorial_moderation_mvp/migration.sql`
3. `prisma/migrations/20260515100000_public_case_history_mvp/migration.sql`
4. `docs/MIGRATION_FIX_20260507153649_REPORT.md` (this file)

## Statements removed / moved

### Removed from `20260507153649_qurbani_db_lastes/migration.sql`

- `ALTER TABLE "ContentReport" ALTER COLUMN "updatedAt" DROP DEFAULT;`
- `ALTER TABLE "PublicCaseHistory" ALTER COLUMN "updatedAt" DROP DEFAULT;`
- `ALTER TABLE "Tutorial" ALTER COLUMN "updatedAt" DROP DEFAULT;`
- `ALTER TABLE "TutorialRevision" ALTER COLUMN "updatedAt" DROP DEFAULT;`
- `ALTER TYPE "LeadStatus" ADD VALUE 'FOLLOW_UP_NEEDED';` (replaced — see below)

### Changed in `20260507153649_qurbani_db_lastes/migration.sql`

- `ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_NEEDED';` (re-append after enum recreation; avoids duplicate-label errors if the value is already present)
- `ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_areaId_fkey";` (was unconditional `DROP CONSTRAINT`; aligns with safer patterns used elsewhere)

### Added to `20260514120000_tutorial_moderation_mvp/migration.sql` (end of file)

```sql
ALTER TABLE "Tutorial" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "TutorialRevision" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ContentReport" ALTER COLUMN "updatedAt" DROP DEFAULT;
```

### Added to `20260515100000_public_case_history_mvp/migration.sql` (end of file)

```sql
ALTER TABLE "PublicCaseHistory" ALTER COLUMN "updatedAt" DROP DEFAULT;
```

## Verification commands run

Local database: Docker Compose PostgreSQL 16 (`postgres:16`), port `5434`, matching `docker-compose.yml`.

| Command | Result |
|---------|--------|
| `npx prisma validate` | Pass |
| `npx prisma generate` | Pass |
| `npx prisma migrate reset --force` | Pass (on `qurbani_db`; Prisma 7 requires consent env when invoked from Cursor — use only on dev DB) |
| `npx prisma migrate deploy` | Pass (no pending migrations after reset) |
| Fresh DB: `CREATE DATABASE qurbani_migrate_deploy_test` + `npx prisma migrate deploy` | Pass (deploy-only from empty DB) |
| `npx prisma db seed` | Pass |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass |
| `npm run build` | Pass |

### Note on `migrate reset --skip-seed`

Prisma **7.x** no longer accepts `--skip-seed` on `prisma migrate reset` (flag is unrecognized). Use `migrate reset --force` and run or skip seed as needed, or control seeding via your workflow.

## Fresh DB migration status

Yes: **`npx prisma migrate deploy` applies all 27 migrations cleanly** on an empty PostgreSQL database (verified with a disposable database).

## Server deployment (after GitHub push)

On the server, with `DATABASE_URL` pointing at the production database (and **not** running destructive commands against production unless intended):

```bash
cd /path/to/qurbani-app
git pull
npm ci   # or pnpm install / yarn install — match your deployment
npx prisma migrate deploy
npm run build   # if your process builds on the server
# restart app process (pm2, systemd, Docker, etc.)
```

For a **brand-new** production database (empty, no `_prisma_migrations`), the same `npx prisma migrate deploy` is sufficient; then run your seed policy if applicable (`npx prisma db seed` only if you intentionally seed production).

**Do not** use `prisma migrate reset` on production.

## Optional cleanup

A one-off test database was created as `qurbani_migrate_deploy_test` on the local Docker Postgres. You can remove it when done:

```bash
docker exec qurbani_postgres psql -U qurbani_user -d postgres -c "DROP DATABASE IF EXISTS qurbani_migrate_deploy_test;"
```
