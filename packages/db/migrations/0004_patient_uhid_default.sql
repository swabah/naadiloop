ALTER TABLE "patients"
ALTER COLUMN "uhid"
SET DEFAULT (
  'UHID-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
);

ALTER TABLE "patients"
DROP CONSTRAINT IF EXISTS "patients_uhid_format";

ALTER TABLE "patients"
ADD CONSTRAINT "patients_uhid_format"
CHECK ("uhid" ~ '^UHID-[A-F0-9]{10}$');
