-- One-time fix: orphan migration name exists in DB but folder was superseded by 20260506200000_qurbani_areas_workflow.
-- Does NOT drop application tables — only removes a stale row from _prisma_migrations.
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260505152206_qurbani_areas_workflow';
