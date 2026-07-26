CREATE TABLE IF NOT EXISTS "action_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "care_action_id" uuid REFERENCES "care_actions"("id") ON DELETE CASCADE,
  "patient_id" uuid REFERENCES "patients"("id"),
  "event_type" "event_type" NOT NULL,
  "created_by" text NOT NULL,
  "notes" text,
  "timestamp" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "action_events_action_time_idx"
ON "action_events" ("care_action_id", "timestamp");

CREATE INDEX IF NOT EXISTS "action_events_patient_time_idx"
ON "action_events" ("patient_id", "timestamp");
