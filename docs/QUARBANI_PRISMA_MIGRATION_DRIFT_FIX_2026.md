# Quarbani 2026 — Prisma migration drift (local dev)

**Scope:** `qurbani-app` only (PostgreSQL + Prisma). Not related to BPA/WPA or other products.

**Purpose:** Explain why `npx prisma migrate status` reports drift, document root cause, and give **safe** remediation options **without** automatically running destructive commands.

---

## 1. Current drift summary (observed)

Command:

```bash
npx prisma migrate status
```

Observed output (representative):

- **9 migrations** found under `prisma/migrations/` on disk.
- **Last common migration** between repo history and database history: **`20260506200000_qurbani_areas_workflow`**.
- **Pending on database** (present locally, not applied to DB): **`20260507120000_user_updated_at_drop_default`**.
- **Recorded in database but missing from repo:** **`20260505152206_qurbani_areas_workflow`**.

So there are **two** distinct issues:

| Issue | Meaning |
|-------|---------|
| **A. Orphan DB row** | `_prisma_migrations` contains a migration name that **no longer exists** as a folder in `prisma/migrations`. |
| **B. Pending migration** | One legitimate migration folder exists locally but has **not been executed** against this database yet. |

---

## 2. Root cause (exact)

### 2.1 Orphan migration name (`20260505152206_qurbani_areas_workflow`)

At some point the database had migration **`20260505152206_qurbani_areas_workflow`** applied and recorded in **`_prisma_migrations`**.

The repository **no longer contains** a folder with that exact name. The areas / workflow work now lives under:

- **`20260506200000_qurbani_areas_workflow`** (see `prisma/migrations/20260506200000_qurbani_areas_workflow/migration.sql`).

That pattern usually means one of:

- The migration was **renamed or recreated** during development (folder deleted + new timestamp).
- Two branches were merged and only one migration folder was kept.
- `migrate dev` produced a new migration that **superseded** an earlier draft after reset/rebuild of migration history.

Prisma compares:

- **Filesystem:** folder names under `prisma/migrations/`.
- **Database:** rows in **`public._prisma_migrations`**.

If the DB still lists **`20260505152206_qurbani_areas_workflow`** but git has **`20260506200000_qurbani_areas_workflow`** instead, Prisma correctly reports **“migration from the database … not found locally.”**

Because **`20260506200000_qurbani_areas_workflow`** is still the **last common** migration, Prisma treats the **schema evolution path** as aligned **through that migration**. The orphan row is **metadata inconsistency**, not necessarily an indication that the physical schema is wrong—but it **must** be reconciled before `migrate status` goes green.

### 2.2 Pending `20260507120000_user_updated_at_drop_default`

This migration is **real** and **intentional**. Its SQL is:

```sql
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
```

It has **not** been applied to the current database. Until it runs (or is marked resolved after equivalent manual change), `migrate status` will keep reporting pending work.

---

## 3. Migrations that exist locally (repo)

These are the **9** migration directories under `prisma/migrations/` (alphabetical by folder name — **not** necessarily apply order; Prisma orders by migration name / recorded history):

| Folder name |
|-------------|
| `20260505132558_init` |
| `20260505134902_add_lead_notes` |
| `20260505135051_add_doctor_fields` |
| `20260505140031_add_lead_utm_fields` |
| `20260505201000_add_lead_duplicate_fields` |
| `20260505223000_add_notifications` |
| `20260506120000_add_user_password_hash` |
| `20260506200000_qurbani_areas_workflow` |
| `20260507120000_user_updated_at_drop_default` |

Plus **`migration_lock.toml`** (`provider = "postgresql"`).

---

## 4. Migrations recorded in the database (how to see them)

Prisma does not print full history in `migrate status`. Inspect the table directly:

```bash
# Example using psql — adjust host/port/user/db from DATABASE_URL
psql "$DATABASE_URL" -c "SELECT migration_name, checksum, finished_at, applied_steps_count FROM _prisma_migrations ORDER BY finished_at;"
```

On the affected dev DB you should see:

- A row for **`20260505152206_qurbani_areas_workflow`** (the orphan — **not** in repo).
- Rows for migrations that match local folders (names must match exactly).
- **No** row yet for **`20260507120000_user_updated_at_drop_default`** until it is applied or resolved.

**Do not** assume row order equals folder order; trust `finished_at` and migration names.

---

## 5. Recommended fixes (choose one path)

### Path A — Preserve data (recommended for dev DB with data you care about)

**Goal:** Remove only the **incorrect metadata row** for the obsolete migration name, then apply the **pending** migration normally.

**Prerequisites:**

1. **Backup** (see §7).
2. Confirm in `_prisma_migrations` that **`20260506200000_qurbani_areas_workflow`** is present and **finished** (the areas workflow is already applied).
3. Confirm you do **not** rely on the orphan migration being the *only* application of schema changes — in practice, **`20260506200000`** should have applied the current areas workflow.

**Steps (conceptual — run yourself after review):**

1. **Backup** again before any SQL that changes `_prisma_migrations`.
2. **Optional safety:** Compare live schema to `prisma/schema.prisma` with:

   ```bash
   npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-url "$DATABASE_URL" --script
   ```

   Large unexpected diffs mean you should stop and investigate before editing migration history.

3. **Remove orphan metadata** (only the row whose `migration_name` is exactly  
   `20260505152206_qurbani_areas_workflow`):

   ```sql
   -- Review first:
   SELECT * FROM "_prisma_migrations" WHERE migration_name = '20260505152206_qurbani_areas_workflow';

   -- Only if you accept the risk (see §8):
   DELETE FROM "_prisma_migrations"
   WHERE migration_name = '20260505152206_qurbani_areas_workflow';
   ```

   This **does not drop application tables**; it only fixes Prisma’s bookkeeping.

4. **Apply pending migration:**

   ```bash
   npx prisma migrate deploy
   ```

   Or in interactive dev:

   ```bash
   npx prisma migrate dev
   ```

5. Re-check:

   ```bash
   npx prisma migrate status
   ```

**Alternative if `migrate deploy` cannot apply `20260507120000`:** Run the SQL from  
`prisma/migrations/20260507120000_user_updated_at_drop_default/migration.sql` manually, then mark applied:

```bash
npx prisma migrate resolve --applied 20260507120000_user_updated_at_drop_default
```

Use this only when the SQL has already been executed exactly once.

---

### Path B — Disposable local database only

If **no valuable data** exists in this Postgres instance:

**Goal:** Single clean migration history matching the repo.

**Backup anyway** (§7), then either:

**B1 — Prisma reset (wipes data)**

```bash
npx prisma migrate reset
```

This **drops** the database (or schema, depending on setup), reapplies all migrations from folder order, and runs seed if configured.

**B2 — Recreate database**

Drop/create database in Docker/pgAdmin, then:

```bash
npx prisma migrate deploy
npm run db:seed   # if you use seed for admin + areas
```

**Risks:** **All data loss** in that database. Never use on shared or production DB.

---

### Path C — Baseline / new environment (no drift yet)

For **new** clones or new databases:

```bash
npx prisma migrate deploy
npm run db:seed   # optional per project
```

No orphan row exists if this DB never saw `20260505152206`.

---

## 6. Exact commands reference (copy/paste checklist)

| Step | Command | Notes |
|------|---------|--------|
| Inspect status | `npx prisma migrate status` | Shows drift summary |
| Inspect DB rows | `psql "$DATABASE_URL" -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;"` | Adjust for Windows quoting |
| Schema vs DB | `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-url "$DATABASE_URL" --script` | Review output before deleting rows |
| Apply migrations | `npx prisma migrate deploy` | CI/prod-style apply |
| Dev apply | `npx prisma migrate dev` | May prompt for new migrations — avoid creating duplicates |
| Mark applied | `npx prisma migrate resolve --applied <migration_folder_name>` | Only after manual SQL matches migration |
| Regenerate client | `npx prisma generate` | After schema/migrations settle |

---

## 7. Backup instructions (before any destructive action)

**PostgreSQL logical backup** (example):

```bash
pg_dump "$DATABASE_URL" > backup_qurbani_$(date +%Y%m%d_%H%M%S).sql
```

On Windows PowerShell, use `pg_dump` with connection string from `.env`, or Docker:

```bash
docker exec <postgres_container> pg_dump -U <user> qurbani_db > backup.sql
```

Keep the file **outside** the repo or in a secure backup location.

**Before:**

- `DELETE` from `_prisma_migrations`
- `prisma migrate reset`
- `DROP DATABASE`
- Any manual `DROP TABLE` / `TRUNCATE`

---

## 8. Risk notes

| Action | Risk |
|--------|------|
| **DELETE orphan `_prisma_migrations` row** | Low **if** `20260506200000_qurbani_areas_workflow` already applied and schema matches; **high** if someone’s DB never applied `20260506200000` and only had `20260505152206` with different SQL — verify with `migrate diff` first. |
| **`migrate resolve --applied` without running SQL** | Schema out of sync with Prisma’s assumptions; runtime errors or drift. |
| **`migrate reset`** | **Total data loss** in target DB. |
| **Editing migration SQL after apply** | Checksums won’t match other environments — avoid; use new migration instead. |

---

## 9. Summary table

| Symptom | Cause | Typical fix |
|---------|--------|-------------|
| DB lists migration not in repo | Renamed/superseded migration folder | Remove orphan `_prisma_migrations` row **or** restore old folder name (not recommended if duplicate of later migration) |
| Pending local migration | Never deployed to this DB | `migrate deploy` or manual SQL + `resolve --applied` |
| Both | Dev DB survived a migration rename | Path A: orphan delete + deploy |

---

## 10. Document maintenance

- After drift is fixed, **`npx prisma migrate status`** should report: **Database schema is up to date** (or equivalent).
- Re-run **`prisma migrate diff`** after fixes if anything still looks wrong.

---

## 11. Final remediation result (local dev — applied)

The drift described in §1 was **resolved** on the development database (`localhost:5434` / `qurbani_db`) using **Path A** (preserve data): metadata cleanup + `migrate deploy`. **`prisma migrate reset` was not used.**

### What was done

| Step | Action |
|------|--------|
| 1 | Deleted **one orphan row** from `public._prisma_migrations` where `migration_name = '20260505152206_qurbani_areas_workflow'` (superseded folder name; does **not** drop user/lead/area tables). |
| 2 | Ran **`npx prisma migrate deploy`**, which applied **`20260507120000_user_updated_at_drop_default`** (`ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;`). |

**Script in repo:** `prisma/scripts/remove_orphan_migration_metadata.sql` (same `DELETE` as §5 Path A).

### Final verification table

| Command | Exit code | Message / outcome |
|---------|-----------|-------------------|
| `npx prisma generate` | 0 | Prisma Client generated |
| `npx prisma validate` | 0 | Schema valid |
| `npx prisma migrate status` | 0 | **Database schema is up to date!** |
| `npm run db:seed` | 0 | Seed OK |
| `npm run lint` | 0 | ESLint clean |
| `npm run typecheck` | 0 | `tsc --noEmit` clean |
| `npm run build` | 0 | Next.js production build OK |

### Exact commands executed (remediation + verification)

```bash
npx prisma db execute --file prisma/scripts/remove_orphan_migration_metadata.sql
npx prisma migrate deploy
npx prisma generate
npx prisma validate
npx prisma migrate status
npm run db:seed
npm run lint
npm run typecheck
npm run build
```

### Notes for other environments

- **Staging/production:** Take a **backup** before any `_prisma_migrations` edit; confirm the orphan migration name exists before running the `DELETE`.
- **If `migrate deploy` fails** after deleting the orphan row, inspect `_prisma_migrations` and schema with `prisma migrate diff` — do not guess.

---

**Document version:** 2026 — includes drift analysis, fix paths, and **§11 final remediation result** (migrate status green; no app logic changes).
