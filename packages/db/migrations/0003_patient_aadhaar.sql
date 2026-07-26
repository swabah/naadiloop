ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "aadhaar_number" text;

CREATE UNIQUE INDEX IF NOT EXISTS "users_aadhaar_number_unique"
ON "users" ("aadhaar_number")
WHERE "aadhaar_number" IS NOT NULL;

ALTER TABLE "users"
DROP CONSTRAINT IF EXISTS "users_aadhaar_number_format";

ALTER TABLE "users"
ADD CONSTRAINT "users_aadhaar_number_format"
CHECK (
  "aadhaar_number" IS NULL
  OR "aadhaar_number" ~ '^[0-9]{12}$'
);
