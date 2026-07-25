ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'reminder_requested' AFTER 'skipped';

ALTER TABLE "care_actions"
  ADD COLUMN IF NOT EXISTS "next_step_communicated" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "parent_action_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'care_actions_parent_action_id_care_actions_id_fk'
  ) THEN
    ALTER TABLE "care_actions"
      ADD CONSTRAINT "care_actions_parent_action_id_care_actions_id_fk"
      FOREIGN KEY ("parent_action_id") REFERENCES "care_actions"("id");
  END IF;
END $$;

ALTER TABLE "action_events"
  ALTER COLUMN "care_action_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "patient_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'action_events_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "action_events"
      ADD CONSTRAINT "action_events_patient_id_patients_id_fk"
      FOREIGN KEY ("patient_id") REFERENCES "patients"("id");
  END IF;
END $$;
