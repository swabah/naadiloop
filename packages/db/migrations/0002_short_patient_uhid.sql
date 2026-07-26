UPDATE "patients"
SET "uhid" = 'UHID-' || upper(right(replace("id"::text, '-', ''), 10))
WHERE "uhid" !~ '^UHID-[A-Z0-9]{10}$';
