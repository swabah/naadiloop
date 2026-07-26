ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "uhid" text;

UPDATE "patients"
SET "uhid" = 'UHID-' || upper(right(replace("id"::text, '-', ''), 10))
WHERE "uhid" IS NULL;

ALTER TABLE "patients" ALTER COLUMN "uhid" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "patients_uhid_unique" ON "patients" ("uhid");
