# Migration fix — P3006 shadow DB / `DoctorApplication` missing (Q26-FIX-CMD-15)

## Root cause

Migration **`20260505193000_canonical_bd_mobile_local`** runs **before** **`20260506200000_qurbani_areas_workflow`**, but it contained unconditional:

```sql
UPDATE "DoctorApplication" ...
```

The **`DoctorApplication`** table is **created** only in **`20260506200000_qurbani_areas_workflow`** (timestamp `20260506200000` > `20260505193000`).

On a **fresh shadow database**, Prisma applies migrations in order, so at step `20260505193000` the relation **does not exist** → PostgreSQL error → **P3006 / P3018** when running `prisma migrate dev`.

`User` and `Lead` updates in the same file are valid at that point (both exist since `init`).

## Why shadow DB failed

Shadow applies the full migration history from empty. The failing statements referenced a table that appears **later** in the timeline — an **ordering bug** in the original SQL, not a Prisma schema bug.

## What fix was applied

1. **`prisma/migrations/20260505193000_canonical_bd_mobile_local/migration.sql`**  
   - Wrapped **`DoctorApplication`** `UPDATE`s in a PostgreSQL `DO $$ ... END $$` block that runs them **only if** `to_regclass('public."DoctorApplication"') IS NOT NULL`.  
   - **`User` / `Lead`** logic unchanged.

2. **`prisma/migrations/20260506200000_qurbani_areas_workflow/migration.sql`**  
   - After **`DoctorApplication`** is created and FKs are attached, appended the **same two `UPDATE` statements** (phone + whatsapp `8801…` → `01…`) so normalization runs for that table **as soon as it exists**.  
   - Idempotent: rows already in local form do not match the `WHERE` regex.

## Migration history: patched vs forward-only

- **Patched existing migration files** (no new migration folder).  
- **Rationale:** The original `20260505193000` migration could not have been successfully applied end-to-end on a clean database that follows this folder order (DoctorApplication updates would always fail).  
- **If** a shared database has `_prisma_migrations` rows for these migrations **with different file checksums** (e.g. after this edit), `prisma migrate deploy` may report a **checksum mismatch**. In that case:
  - Confirm DB state matches expectations (phones already normalized if applicable).
  - Follow [Prisma’s guidance](https://www.prisma.io/docs/guides/migrate/troubleshooting-development) for checksum / migration repair in your environment, **or** restore the previous migration file and use a dedicated forward migration (team decision).

## Files changed

| File | Change |
|------|--------|
| `prisma/migrations/20260505193000_canonical_bd_mobile_local/migration.sql` | Guarded `DoctorApplication` updates |
| `prisma/migrations/20260506200000_qurbani_areas_workflow/migration.sql` | `DoctorApplication` normalization after `CREATE TABLE` |
| `docs/Q26_MIGRATION_FIX_P3006_DOCTOR_APPLICATION.md` | This document |

## Commands run (development verification)

- `npx prisma validate` — success  
- `npx prisma generate` — success  
- `npx prisma migrate dev --name cmd15_shadow_verify` — **fails** on a database that **already applied** the previous checksum of `20260506200000` (Prisma asks for `migrate reset`). Use empty DB proof below instead, or reset **local-only** dev DB.  
- `npx prisma migrate deploy` — **success** on a **fresh** empty database (all 14 migrations applied).  
- `npm run lint` — success  
- `npm run typecheck` — success  
- `npm run build` — success  

### Clean-database proof

An ephemeral PostgreSQL container was used with `migrate deploy`; the full chain applied without error, confirming shadow-order safety for **`20260505193000`** (guarded `DoctorApplication`) and **`20260506200000`** (normalization after `CREATE TABLE`).

### Existing dev database

If `20260506200000` was already applied before this change, Prisma reports the migration was **modified after apply**. Options: **`prisma migrate reset`** (local dev, data loss) or Prisma’s **repair / baseline** docs for shared environments — **never reset production** without backup and approval.

## Remaining manual DB steps

- **None** for a fresh `migrate dev` / new shadow, beyond normal `DATABASE_URL` and migrate workflow.  
- **Checksum / already-deployed** environments: see section above if `deploy` complains after pulling this change.

## Product behavior

Unchanged: same normalization rules for `User`, `Lead`, and `DoctorApplication` where applicable.
