-- Canonical Bangladesh mobiles in DB: local format `01[3-9]XXXXXXXX` (11 digits).
-- Convert legacy `8801XXXXXXXXX` (13 digits) stored values.

UPDATE "User"
SET phone = '0' || SUBSTRING(phone FROM 4)
WHERE phone ~ '^8801[3-9][0-9]{8}$';

UPDATE "User"
SET whatsapp = '0' || SUBSTRING(whatsapp FROM 4)
WHERE whatsapp IS NOT NULL
  AND whatsapp ~ '^8801[3-9][0-9]{8}$';

UPDATE "Lead"
SET phone = '0' || SUBSTRING(phone FROM 4)
WHERE phone ~ '^8801[3-9][0-9]{8}$';

UPDATE "Lead"
SET whatsapp = '0' || SUBSTRING(whatsapp FROM 4)
WHERE whatsapp IS NOT NULL
  AND whatsapp ~ '^8801[3-9][0-9]{8}$';

-- DoctorApplication is created in migration 20260506200000_qurbani_areas_workflow.
-- Shadow DB applies migrations in timestamp order, so the table may not exist here.
DO $$
BEGIN
  IF to_regclass('public."DoctorApplication"') IS NOT NULL THEN
    UPDATE "DoctorApplication"
    SET phone = '0' || SUBSTRING(phone FROM 4)
    WHERE phone ~ '^8801[3-9][0-9]{8}$';

    UPDATE "DoctorApplication"
    SET whatsapp = '0' || SUBSTRING(whatsapp FROM 4)
    WHERE whatsapp IS NOT NULL
      AND whatsapp ~ '^8801[3-9][0-9]{8}$';
  END IF;
END $$;
