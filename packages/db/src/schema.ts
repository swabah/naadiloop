import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const documentType = pgEnum("document_type", [
  "discharge_summary",
  "prescription",
  "referral",
  "lab_form",
  "other",
]);

export const actionType = pgEnum("action_type", ["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"]);

export const priority = pgEnum("priority", ["NORMAL", "URGENT"]);

export const actionStatus = pgEnum("action_status", [
  "PENDING",
  "DUE",
  "COMPLETED",
  "AWAITING_REVIEW",
  "REVIEWED",
  "CLOSED",
]);

export const carePlanStatus = pgEnum("care_plan_status", ["draft", "verified", "active", "closed"]);

export const reportStatus = pgEnum("report_status", ["AWAITING_REVIEW", "REVIEWED"]);

export const eventType = pgEnum("event_type", [
  "created",
  "verified",
  "activated",
  "completed",
  "skipped",
  "help_requested",
  "review_started",
  "reviewed",
  "closed",
  "follow_up_created",
]);

export interface MedicationPayload {
  schedule?: string;
  durationDays?: number;
}

export interface TestPayload {
  testName?: string;
}

export interface ReferralPayload {
  specialty?: string;
}

export interface FollowUpPayload {
  reason?: string;
}

export type CareActionPayload = MedicationPayload | TestPayload | ReferralPayload | FollowUpPayload;

export interface CaregiverContact {
  name?: string;
  phone?: string;
}

export const patient = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  phone: text("phone"),
  language: text("language").default("en").notNull(),
  caregiverContact: jsonb("caregiver_contact").$type<CaregiverContact>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sourceDocument = pgTable("source_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .references(() => patient.id)
    .notNull(),
  documentType: documentType("document_type").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carePlan = pgTable("care_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .references(() => patient.id)
    .notNull(),
  providerId: uuid("provider_id").notNull(),
  status: carePlanStatus("status").default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const careAction = pgTable("care_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  carePlanId: uuid("care_plan_id")
    .references(() => carePlan.id)
    .notNull(),
  type: actionType("type").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: actionStatus("status").default("PENDING").notNull(),
  priority: priority("priority").default("NORMAL").notNull(),
  sourceText: text("source_text").notNull(),
  assignedTo: text("assigned_to").default("patient").notNull(),
  reviewRequired: boolean("review_required").default(false).notNull(),
  verified: boolean("verified").default(false).notNull(),
  payload: jsonb("payload").$type<CareActionPayload>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const report = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  careActionId: uuid("care_action_id")
    .references(() => careAction.id)
    .notNull(),
  fileUrl: text("file_url").notNull(),
  status: reportStatus("status").default("AWAITING_REVIEW").notNull(),
  providerComment: text("provider_comment"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const actionEvent = pgTable("action_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  careActionId: uuid("care_action_id")
    .references(() => careAction.id)
    .notNull(),
  eventType: eventType("event_type").notNull(),
  createdBy: text("created_by").notNull(),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
});

export const DEMO_PROVIDER_ID = "10000000-0000-4000-8000-000000000001";
export const DEMO_PATIENT_ID = "20000000-0000-4000-8000-000000000001";
