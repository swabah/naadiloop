import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { inArray } from "drizzle-orm";
import { getDb } from "./client";
import {
  actionEvents,
  careActions,
  carePlans,
  DEMO_PATIENT_ID,
  DEMO_PROVIDER_ID,
  organizationDetails,
  patients,
  providerPatientAssignments,
  reports,
  sourceDocuments,
  users,
} from "./schema";
import { uhidFromPatientId } from "./uhid";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const SUPERADMIN_ID = "00000000-0000-4000-8000-000000000001";
const PENDING_ADMIN_ID = "80000000-0000-4000-8000-000000000001";
const SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() || "superadmin@naadi.demo";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "admin123";

const ids = {
  document: "30000000-0000-4000-8000-000000000001",
  draftDocument: "30000000-0000-4000-8000-000000000002",
  closedDocument: "30000000-0000-4000-8000-000000000003",
  plan: "40000000-0000-4000-8000-000000000001",
  draftPlan: "40000000-0000-4000-8000-000000000002",
  closedPlan: "40000000-0000-4000-8000-000000000003",
  medication: "50000000-0000-4000-8000-000000000001",
  test: "50000000-0000-4000-8000-000000000002",
  referral: "50000000-0000-4000-8000-000000000003",
  followUp: "50000000-0000-4000-8000-000000000004",
  draftMedication: "50000000-0000-4000-8000-000000000005",
  draftTest: "50000000-0000-4000-8000-000000000006",
  closedTest: "50000000-0000-4000-8000-000000000007",
  report: "60000000-0000-4000-8000-000000000001",
  closedReport: "60000000-0000-4000-8000-000000000002",
  events: [
    "70000000-0000-4000-8000-000000000001",
    "70000000-0000-4000-8000-000000000002",
    "70000000-0000-4000-8000-000000000003",
    "70000000-0000-4000-8000-000000000004",
    "70000000-0000-4000-8000-000000000005",
    "70000000-0000-4000-8000-000000000006",
    "70000000-0000-4000-8000-000000000007",
    "70000000-0000-4000-8000-000000000008",
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

  // Hash passwords
  const adminPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const userPassword = await bcrypt.hash("password123", 10);

  // Keep the configured Super Admin credential usable when the seed is rerun.
  await db
    .insert(users)
    .values({
      id: SUPERADMIN_ID,
      email: SUPER_ADMIN_EMAIL,
      passwordHash: adminPassword,
      name: "Super Admin",
      phone: "+91 90000 00000",
      role: "super_admin",
      status: "active",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: SUPER_ADMIN_EMAIL,
        passwordHash: adminPassword,
        role: "super_admin",
        status: "active",
      },
    });

  if (process.argv.includes("--super-admin-only")) {
    console.log(`Super Admin credential refreshed for ${SUPER_ADMIN_EMAIL}.`);
    return;
  }

  // 1. Seed remaining users
  await db
    .insert(users)
    .values([
      {
        id: DEMO_PROVIDER_ID,
        email: "anjali@naadi.demo",
        passwordHash: userPassword,
        name: "Dr. Anjali Nair",
        phone: "+91 98765 00001",
        role: "hospital_admin",
        status: "active",
      },
      {
        id: DEMO_PATIENT_ID,
        email: "rajan@naadi.demo",
        passwordHash: userPassword,
        name: "Rajan Menon",
        phone: "+91 98765 43210",
        role: "patient",
        status: "active",
      },
      {
        id: PENDING_ADMIN_ID,
        email: "kerala.pharmacy@naadi.demo",
        passwordHash: userPassword,
        name: "Kerala Central Meds",
        phone: "+91 98765 99999",
        role: "pharmacy_admin",
        status: "pending_approval",
      },
    ])
    .onConflictDoNothing();

  // 2. Seed organization details
  await db
    .insert(organizationDetails)
    .values([
      {
        userId: DEMO_PROVIDER_ID,
        orgName: "CityCare Multispecialty Hospital",
        orgType: "hospital",
        licenseNumber: "HOSP-44321",
        address: "123 Health Avenue",
        city: "Kochi",
        state: "Kerala",
        pincode: "682001",
      },
      {
        userId: PENDING_ADMIN_ID,
        orgName: "Kerala Central Pharmacy",
        orgType: "pharmacy",
        licenseNumber: "PHARM-88712",
        address: "45 MG Road",
        city: "Kochi",
        state: "Kerala",
        pincode: "682016",
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(patients)

    .values({
      id: DEMO_PATIENT_ID,
      uhid: uhidFromPatientId(DEMO_PATIENT_ID),
      name: "Rajan Menon",
      age: "55",
      phone: "+91 98765 43210",
      language: "en",
      caregiverContact: { name: "Maya Menon", phone: "+91 98765 43211" },
    })
    .onConflictDoUpdate({
      target: patients.id,
      set: {
        uhid: uhidFromPatientId(DEMO_PATIENT_ID),
        name: "Rajan Menon",
        age: "55",
        phone: "+91 98765 43210",
        language: "en",
        caregiverContact: { name: "Maya Menon", phone: "+91 98765 43211" },
      },
    });

  await db
    .insert(providerPatientAssignments)
    .values({ providerId: DEMO_PROVIDER_ID, patientId: DEMO_PATIENT_ID })
    .onConflictDoNothing();

  await db
    .insert(sourceDocuments)
    .values([
      {
        id: ids.document,
        patientId: DEMO_PATIENT_ID,
        documentType: "discharge_summary",
        content:
          "Take Amlodipine 5 mg once daily after breakfast. Complete a CBC blood test tomorrow. Attend a cardiology consultation within three days. Return to the PHC for follow-up in seven days.",
      },
      {
        id: ids.draftDocument,
        patientId: DEMO_PATIENT_ID,
        documentType: "discharge_summary",
        content:
          "Start Metformin 500 mg twice daily with meals. Schedule an HbA1c test in fourteen days. Book a dietitian consultation next month. Return to the PHC in thirty days for review.",
      },
      {
        id: ids.closedDocument,
        patientId: DEMO_PATIENT_ID,
        documentType: "lab_form",
        content:
          "Complete a fasting blood sugar test and return the report to the Provider for review.",
      },
    ])
    .onConflictDoUpdate({
      target: sourceDocuments.id,
      set: { uploadedAt: now },
    });

  await db
    .insert(carePlans)
    .values({
      id: ids.plan,
      patientId: DEMO_PATIENT_ID,
      providerId: DEMO_PROVIDER_ID,
      sourceDocumentId: ids.document,
      status: "active",
      verifiedAt: now,
    })
    .onConflictDoUpdate({
      target: carePlans.id,
      set: { status: "active", verifiedAt: now, sourceDocumentId: ids.document },
    });

  await db
    .insert(carePlans)
    .values({
      id: ids.draftPlan,
      patientId: DEMO_PATIENT_ID,
      providerId: DEMO_PROVIDER_ID,
      sourceDocumentId: ids.draftDocument,
      status: "draft",
    })
    .onConflictDoUpdate({
      target: carePlans.id,
      set: { status: "draft", verifiedAt: null, sourceDocumentId: ids.draftDocument },
    });

  await db
    .insert(carePlans)
    .values({
      id: ids.closedPlan,
      patientId: DEMO_PATIENT_ID,
      providerId: DEMO_PROVIDER_ID,
      sourceDocumentId: ids.closedDocument,
      status: "closed",
      verifiedAt: daysFromNow(-14),
      createdAt: daysFromNow(-15),
    })
    .onConflictDoUpdate({
      target: carePlans.id,
      set: {
        status: "closed",
        verifiedAt: daysFromNow(-14),
        sourceDocumentId: ids.closedDocument,
      },
    });

  await db
    .delete(careActions)
    .where(inArray(careActions.carePlanId, [ids.plan, ids.draftPlan, ids.closedPlan]));

  await db
    .insert(careActions)
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
      {
        id: ids.closedTest,
        carePlanId: ids.closedPlan,
        type: "TEST",
        title: "Complete fasting blood sugar test",
        instructions: "Complete the test and return the report for Provider review.",
        dueDate: daysFromNow(-10),
        status: "CLOSED",
        priority: "NORMAL",
        sourceText:
          "Complete a fasting blood sugar test and return the report to the Provider for review.",
        reviewRequired: true,
        verified: true,
        nextStepCommunicated: true,
        payload: { testName: "Fasting blood sugar" },
        createdAt: daysFromNow(-15),
      },
    ])
    .onConflictDoUpdate({
      target: careActions.id,
      set: { createdAt: now },
    });

  await db
    .insert(careActions)
    .values([
      {
        id: ids.draftMedication,
        carePlanId: ids.draftPlan,
        type: "MEDICATION",
        title: "Start Metformin",
        instructions: "Take 500 mg twice daily with meals.",
        dueDate: daysFromNow(0),
        status: "PENDING",
        priority: "NORMAL",
        sourceText: "Start Metformin 500 mg twice daily with meals.",
        reviewRequired: false,
        verified: false,
        payload: { schedule: "Twice daily with meals", durationDays: 30 },
      },
      {
        id: ids.draftTest,
        carePlanId: ids.draftPlan,
        type: "TEST",
        title: "Schedule HbA1c test",
        instructions: "Visit the PHC lab in fourteen days and upload the report.",
        dueDate: daysFromNow(14),
        status: "PENDING",
        priority: "NORMAL",
        sourceText: "Schedule an HbA1c test in fourteen days.",
        reviewRequired: true,
        verified: false,
        payload: { testName: "HbA1c" },
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(reports)
    .values({
      id: ids.report,
      careActionId: ids.test,
      fileName: "fictional-cbc-report.pdf",
      fileType: "application/pdf",
      fileSize: 42_000,
      status: "AWAITING_REVIEW",
      uploadedAt: now,
    })
    .onConflictDoUpdate({
      target: reports.id,
      set: { status: "AWAITING_REVIEW", uploadedAt: now, reviewedAt: null },
    });

  await db
    .insert(reports)
    .values({
      id: ids.closedReport,
      careActionId: ids.closedTest,
      fileName: "fictional-fasting-blood-sugar.pdf",
      fileType: "application/pdf",
      fileSize: 38_000,
      status: "REVIEWED",
      providerComment: "Reviewed with the Patient. Continue the current follow-up plan.",
      uploadedAt: daysFromNow(-11),
      reviewedAt: daysFromNow(-10),
    })
    .onConflictDoUpdate({
      target: reports.id,
      set: {
        status: "REVIEWED",
        providerComment: "Reviewed with the Patient. Continue the current follow-up plan.",
        uploadedAt: daysFromNow(-11),
        reviewedAt: daysFromNow(-10),
      },
    });

  await db
    .insert(actionEvents)
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
      {
        id: ids.events[4],
        careActionId: ids.closedTest,
        patientId: DEMO_PATIENT_ID,
        eventType: "created",
        createdBy: "system",
        notes: "Created from the fictional lab instruction.",
        timestamp: daysFromNow(-15),
      },
      {
        id: ids.events[5],
        careActionId: ids.closedTest,
        patientId: DEMO_PATIENT_ID,
        eventType: "completed",
        createdBy: "patient",
        notes: "Patient completed the test and returned the report.",
        timestamp: daysFromNow(-11),
      },
      {
        id: ids.events[6],
        careActionId: ids.closedTest,
        patientId: DEMO_PATIENT_ID,
        eventType: "reviewed",
        createdBy: "provider",
        notes: "Provider reviewed the report and communicated the next step.",
        timestamp: daysFromNow(-10),
      },
      {
        id: ids.events[7],
        careActionId: ids.closedTest,
        patientId: DEMO_PATIENT_ID,
        eventType: "closed",
        createdBy: "provider",
        notes: "Loop closed after review and next-step communication.",
        timestamp: daysFromNow(-10),
      },
    ])
    .onConflictDoNothing();

  console.log("Naadi Loop reference scenario seeded.");
}

seed().catch((error) => {
  console.error("Failed to seed Naadi Loop:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
