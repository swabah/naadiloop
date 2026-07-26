CREATE TABLE "patient_link_requests" (
  "provider_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "requested_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("provider_id", "patient_id")
);

CREATE INDEX "patient_link_requests_patient_expiry_idx"
  ON "patient_link_requests" ("patient_id", "expires_at");
