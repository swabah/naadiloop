DO $$ BEGIN
  ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'dose_taken';
  ALTER TYPE "public"."event_type" ADD VALUE IF NOT EXISTS 'dose_skipped';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."medication_dose_status" AS ENUM('taken', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "medication_dose_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "care_action_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "scheduled_for" timestamp with time zone NOT NULL,
  "status" "medication_dose_status" NOT NULL,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "medication_dose_records_care_action_id_care_actions_id_fk"
    FOREIGN KEY ("care_action_id") REFERENCES "public"."care_actions"("id")
    ON DELETE cascade,
  CONSTRAINT "medication_dose_records_patient_id_patients_id_fk"
    FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id")
    ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "medication_dose_action_schedule_unique"
  ON "medication_dose_records" USING btree ("care_action_id", "scheduled_for");
CREATE INDEX IF NOT EXISTS "medication_dose_patient_schedule_idx"
  ON "medication_dose_records" USING btree ("patient_id", "scheduled_for");
