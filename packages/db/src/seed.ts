import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { getDb } from "./client";
import {
  actionEvent,
  careAction,
  carePlan,
  DEMO_PATIENT_ID,
  DEMO_PROVIDER_ID,
  patient,
  report,
  sourceDocument,
} from "./schema";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const ids = {
  document: "30000000-0000-4000-8000-000000000001",
  plan: "40000000-0000-4000-8000-000000000001",
  medication: "50000000-0000-4000-8000-000000000001",
  test: "50000000-0000-4000-8000-000000000002",
  referral: "50000000-0000-4000-8000-000000000003",
  followUp: "50000000-0000-4000-8000-000000000004",
  report: "60000000-0000-4000-8000-000000000001",
  events: [
    "70000000-0000-4000-8000-000000000001",
    "70000000-0000-4000-8000-000000000002",
    "70000000-0000-4000-8000-000000000003",
    "70000000-0000-4000-8000-000000000004",
  ],
} as const;

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setUTCHours(9, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

async function seed() {
  const db = getDb(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL);
  const now = new Date();

  await db
    .insert(patient)
    .values({
      id: DEMO_PATIENT_ID,
      name: "Rajan Menon",
      age: "55",
      phone: "+91 98765 43210",
      language: "en",
      caregiverContact: { name: "Maya Menon", phone: "+91 98765 43211" },
    })
    .onConflictDoUpdate({
      target: patient.id,
      set: {
        name: "Rajan Menon",
        age: "55",
        phone: "+91 98765 43210",
        language: "en",
        caregiverContact: { name: "Maya Menon", phone: "+91 98765 43211" },
      },
    });

  await db
    .insert(sourceDocument)
    .values({
      id: ids.document,
      patientId: DEMO_PATIENT_ID,
      documentType: "discharge_summary",
      content:
        "Take Amlodipine 5 mg once daily after breakfast. Complete a CBC blood test tomorrow. Attend a cardiology consultation within three days. Return to the PHC for follow-up in seven days.",
    })
    .onConflictDoUpdate({
      target: sourceDocument.id,
      set: { uploadedAt: now },
    });

  await db
    .insert(carePlan)
    .values({
      id: ids.plan,
      patientId: DEMO_PATIENT_ID,
      providerId: DEMO_PROVIDER_ID,
      status: "verified",
      verifiedAt: now,
    })
    .onConflictDoUpdate({
      target: carePlan.id,
      set: { status: "verified", verifiedAt: now },
    });

  await db
    .insert(careAction)
    .values([
      {
        id: ids.medication,
        carePlanId: ids.plan,
        type: "MEDICATION",
        title: "Take Amlodipine",
        instructions: "Take 5 mg once daily after breakfast.",
        dueDate: daysFromNow(0),
        status: "DUE",
        priority: "NORMAL",
        sourceText: "Take Amlodipine 5 mg once daily after breakfast.",
        reviewRequired: false,
        verified: true,
        payload: { schedule: "Once daily after breakfast", durationDays: 30 },
      },
      {
        id: ids.test,
        carePlanId: ids.plan,
        type: "TEST",
        title: "Complete CBC blood test",
        instructions: "Visit the PHC lab tomorrow and upload the report.",
        dueDate: daysFromNow(1),
        status: "AWAITING_REVIEW",
        priority: "NORMAL",
        sourceText: "Complete a CBC blood test tomorrow.",
        reviewRequired: true,
        verified: true,
        payload: { testName: "Complete blood count (CBC)" },
      },
      {
        id: ids.referral,
        carePlanId: ids.plan,
        type: "REFERRAL",
        title: "Attend cardiology consultation",
        instructions: "Take the referral slip to the cardiology clinic.",
        dueDate: daysFromNow(-2),
        status: "PENDING",
        priority: "URGENT",
        sourceText: "Attend a cardiology consultation within three days.",
        reviewRequired: true,
        verified: true,
        payload: { specialty: "Cardiology" },
      },
      {
        id: ids.followUp,
        carePlanId: ids.plan,
        type: "FOLLOW_UP",
        title: "Return to the PHC",
        instructions: "Bring your test report and medication list.",
        dueDate: daysFromNow(7),
        status: "PENDING",
        priority: "NORMAL",
        sourceText: "Return to the PHC for follow-up in seven days.",
        reviewRequired: false,
        verified: true,
        payload: { reason: "Review symptoms and CBC result" },
      },
    ])
    .onConflictDoUpdate({
      target: careAction.id,
      set: {
        verified: true,
        createdAt: now,
      },
    });

  await db
    .insert(report)
    .values({
      id: ids.report,
      careActionId: ids.test,
      fileUrl: "https://example.invalid/demo/cbc-report.pdf",
      status: "AWAITING_REVIEW",
      uploadedAt: now,
    })
    .onConflictDoUpdate({
      target: report.id,
      set: { status: "AWAITING_REVIEW", uploadedAt: now, reviewedAt: null },
    });

  await db
    .insert(actionEvent)
    .values([
      {
        id: ids.events[0],
        careActionId: ids.medication,
        eventType: "created",
        createdBy: "system",
        notes: "Extracted from the discharge summary.",
      },
      {
        id: ids.events[1],
        careActionId: ids.test,
        eventType: "verified",
        createdBy: "provider",
        notes: "Verified by Dr. Anjali.",
      },
      {
        id: ids.events[2],
        careActionId: ids.test,
        eventType: "review_started",
        createdBy: "patient",
        notes: "CBC report uploaded and awaiting review.",
      },
      {
        id: ids.events[3],
        careActionId: ids.referral,
        eventType: "created",
        createdBy: "system",
        notes: "Seeded overdue referral for the provider dashboard.",
      },
    ])
    .onConflictDoNothing();

  console.log("Naadi Loop reference scenario seeded.");
}

seed().catch((error) => {
  console.error("Failed to seed Naadi Loop:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
