import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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
  "reminder_requested",
  "help_requested",
  "review_started",
  "reviewed",
  "closed",
  "follow_up_created",
  "help_resolved",
]);

export const userRole = pgEnum("user_role", [
  "patient",
  "hospital_admin",
  "pharmacy_admin",
  "super_admin",
]);

export const userStatus = pgEnum("user_status", ["active", "pending_approval", "rejected"]);

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

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  uhid: text("uhid")
    .default(sql`'UHID-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))`)
    .notNull()
    .unique(),
  name: text("name").notNull(),
  age: text("age"),
  phone: text("phone"),
  language: text("language").default("en").notNull(),
  caregiverContact: jsonb("caregiver_contact").$type<CaregiverContact>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sourceDocuments = pgTable("source_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id")
    .references(() => patients.id)
    .notNull(),
  documentType: documentType("document_type").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carePlans = pgTable(
  "care_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .references(() => patients.id)
      .notNull(),
    providerId: uuid("provider_id")
      .references((): AnyPgColumn => users.id)
      .notNull(),
    sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id),
    status: carePlanStatus("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [
    index("care_plans_patient_status_idx").on(table.patientId, table.status),
    index("care_plans_provider_status_idx").on(table.providerId, table.status),
  ],
);

export const careActions = pgTable(
  "care_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    carePlanId: uuid("care_plan_id")
      .references(() => carePlans.id, { onDelete: "cascade" })
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
    nextStepCommunicated: boolean("next_step_communicated").default(false).notNull(),
    parentActionId: uuid("parent_action_id").references((): AnyPgColumn => careActions.id),
    payload: jsonb("payload").$type<CareActionPayload>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("care_actions_plan_status_idx").on(table.carePlanId, table.status),
    index("care_actions_due_date_idx").on(table.dueDate),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careActionId: uuid("care_action_id")
      .references(() => careActions.id, { onDelete: "cascade" })
      .notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    status: reportStatus("status").default("AWAITING_REVIEW").notNull(),
    providerComment: text("provider_comment"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("reports_care_action_unique").on(table.careActionId),
    index("reports_status_idx").on(table.status),
  ],
);

export const actionEvents = pgTable(
  "action_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careActionId: uuid("care_action_id").references(() => careActions.id, {
      onDelete: "cascade",
    }),
    patientId: uuid("patient_id").references(() => patients.id),
    eventType: eventType("event_type").notNull(),
    createdBy: text("created_by").notNull(),
    notes: text("notes"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("action_events_action_time_idx").on(table.careActionId, table.timestamp),
    index("action_events_patient_time_idx").on(table.patientId, table.timestamp),
  ],
);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  aadhaarNumber: text("aadhaar_number").unique(),
  role: userRole("role").notNull(),
  status: userStatus("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizationDetails = pgTable(
  "organization_details",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    orgName: text("org_name").notNull(),
    orgType: text("org_type").notNull(),
    licenseNumber: text("license_number").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("organization_details_user_unique").on(table.userId)],
);

export const providerPatientAssignments = pgTable(
  "provider_patient_assignments",
  {
    providerId: uuid("provider_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    patientId: uuid("patient_id")
      .references(() => patients.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.providerId, table.patientId] }),
    index("provider_patient_patient_idx").on(table.patientId),
  ],
);

export const DEMO_PROVIDER_ID = "10000000-0000-4000-8000-000000000001";
export const DEMO_PATIENT_ID = "20000000-0000-4000-8000-000000000001";
