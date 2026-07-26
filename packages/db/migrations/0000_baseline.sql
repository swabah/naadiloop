CREATE TYPE "document_type" AS ENUM ('discharge_summary', 'prescription', 'referral', 'lab_form', 'other');
CREATE TYPE "action_type" AS ENUM ('MEDICATION', 'TEST', 'REFERRAL', 'FOLLOW_UP');
CREATE TYPE "priority" AS ENUM ('NORMAL', 'URGENT');
CREATE TYPE "action_status" AS ENUM ('PENDING', 'DUE', 'COMPLETED', 'AWAITING_REVIEW', 'REVIEWED', 'CLOSED');
CREATE TYPE "care_plan_status" AS ENUM ('draft', 'verified', 'active', 'closed');
CREATE TYPE "report_status" AS ENUM ('AWAITING_REVIEW', 'REVIEWED');
CREATE TYPE "event_type" AS ENUM (
  'created',
  'verified',
  'activated',
  'completed',
  'skipped',
  'reminder_requested',
  'help_requested',
  'review_started',
  'reviewed',
  'closed',
  'follow_up_created',
  'help_resolved'
);
CREATE TYPE "user_role" AS ENUM ('patient', 'hospital_admin', 'pharmacy_admin', 'super_admin');
CREATE TYPE "user_status" AS ENUM ('active', 'pending_approval', 'rejected');

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "role" "user_role" NOT NULL,
  "status" "user_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "organization_details" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "org_name" text NOT NULL,
  "org_type" text NOT NULL,
  "license_number" text NOT NULL,
  "address" text,
  "city" text,
  "state" text,
  "pincode" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "organization_details_user_unique" ON "organization_details" ("user_id");

CREATE TABLE "patients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "uhid" text NOT NULL,
  "name" text NOT NULL,
  "age" text,
  "phone" text,
  "language" text DEFAULT 'en' NOT NULL,
  "caregiver_contact" jsonb,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "patients_uhid_unique" ON "patients" ("uhid");

CREATE TABLE "provider_patient_assignments" (
  "provider_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY ("provider_id", "patient_id")
);

CREATE INDEX "provider_patient_patient_idx" ON "provider_patient_assignments" ("patient_id");

CREATE TABLE "source_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "document_type" "document_type" NOT NULL,
  "content" text NOT NULL,
  "uploaded_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE "care_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id"),
  "provider_id" uuid NOT NULL REFERENCES "users"("id"),
  "source_document_id" uuid REFERENCES "source_documents"("id"),
  "status" "care_plan_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "verified_at" timestamptz
);

CREATE INDEX "care_plans_patient_status_idx" ON "care_plans" ("patient_id", "status");
CREATE INDEX "care_plans_provider_status_idx" ON "care_plans" ("provider_id", "status");

CREATE TABLE "care_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "care_plan_id" uuid NOT NULL REFERENCES "care_plans"("id") ON DELETE CASCADE,
  "type" "action_type" NOT NULL,
  "title" text NOT NULL,
  "instructions" text NOT NULL,
  "due_date" timestamptz,
  "status" "action_status" DEFAULT 'PENDING' NOT NULL,
  "priority" "priority" DEFAULT 'NORMAL' NOT NULL,
  "source_text" text NOT NULL,
  "assigned_to" text DEFAULT 'patient' NOT NULL,
  "review_required" boolean DEFAULT false NOT NULL,
  "verified" boolean DEFAULT false NOT NULL,
  "next_step_communicated" boolean DEFAULT false NOT NULL,
  "parent_action_id" uuid REFERENCES "care_actions"("id"),
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "care_actions_plan_status_idx" ON "care_actions" ("care_plan_id", "status");
CREATE INDEX "care_actions_due_date_idx" ON "care_actions" ("due_date");

CREATE TABLE "reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "care_action_id" uuid NOT NULL REFERENCES "care_actions"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "file_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "status" "report_status" DEFAULT 'AWAITING_REVIEW' NOT NULL,
  "provider_comment" text,
  "uploaded_at" timestamptz DEFAULT now() NOT NULL,
  "reviewed_at" timestamptz
);

CREATE UNIQUE INDEX "reports_care_action_unique" ON "reports" ("care_action_id");
CREATE INDEX "reports_status_idx" ON "reports" ("status");

CREATE TABLE "action_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "care_action_id" uuid REFERENCES "care_actions"("id") ON DELETE CASCADE,
  "patient_id" uuid REFERENCES "patients"("id"),
  "event_type" "event_type" NOT NULL,
  "created_by" text NOT NULL,
  "notes" text,
  "timestamp" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "action_events_action_time_idx" ON "action_events" ("care_action_id", "timestamp");
CREATE INDEX "action_events_patient_time_idx" ON "action_events" ("patient_id", "timestamp");
