import { fileURLToPath } from "node:url";
import {
  actionEvents,
  carePlans,
  DEMO_PROVIDER_ID,
  getDb,
  patients,
  providerPatientAssignments,
  sourceDocuments,
  users,
} from "@naadi/db";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { appRouter } from "./router";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

if (process.env.ALLOW_DEMO_SMOKE_TEST !== "true") {
  throw new Error("Set ALLOW_DEMO_SMOKE_TEST=true to run the temporary UHID journey smoke test.");
}

const db = getDb();
const email = `uhid-smoke-${crypto.randomUUID()}@example.test`;
let patientId: string | undefined;

try {
  const publicCaller = appRouter.createCaller({ db, user: null });
  const registration = await publicCaller.auth.register({
    name: "UHID Smoke Patient",
    email,
    password: "smoke-password",
    phone: "+91 90000 00001",
    aadhaarNumber: crypto.randomUUID().replace(/\D/g, "").padEnd(12, "0").slice(0, 12),
    role: "patient",
    age: "40",
    language: "en",
  });
  if (!registration.uhid) throw new Error("Patient registration did not return a UHID.");

  const patient = await db.query.patients.findFirst({
    where: eq(patients.uhid, registration.uhid),
  });
  if (!patient) throw new Error("Registered Patient profile was not persisted.");
  patientId = patient.id;

  const initialAssignment = await db.query.providerPatientAssignments.findFirst({
    where: eq(providerPatientAssignments.patientId, patient.id),
  });
  if (initialAssignment) throw new Error("New Patient was assigned before OTP consent.");

  const provider = await db.query.users.findFirst({ where: eq(users.id, DEMO_PROVIDER_ID) });
  if (provider?.status !== "active" || provider.role !== "hospital_admin") {
    throw new Error("Seeded Hospital Provider is unavailable.");
  }
  const providerCaller = appRouter.createCaller({
    db,
    user: {
      id: provider.id,
      email: provider.email,
      name: provider.name,
      role: provider.role,
      status: "active",
    },
  });

  const lookup = await providerCaller.patient.findByUhid({ uhid: registration.uhid });
  if (lookup.alreadyAssigned) throw new Error("UHID lookup reported an unexpected assignment.");

  let badOtpRejected = false;
  try {
    await providerCaller.patient.linkByUhid({ uhid: registration.uhid, otp: "123456" });
  } catch {
    badOtpRejected = true;
  }
  if (!badOtpRejected) throw new Error("Invalid OTP was accepted.");

  await providerCaller.patient.linkByUhid({ uhid: registration.uhid, otp: "000000" });

  const sourceText = "Take the fictional tablet once daily after breakfast.";
  const document = await providerCaller.document.create({
    patientId: patient.id,
    type: "prescription",
    content: sourceText,
  });
  const draft = await providerCaller.carePlan.createManualDraft({ documentId: document.id });
  await providerCaller.carePlan.verify({
    carePlanId: draft.carePlanId,
    actions: [
      {
        type: "MEDICATION",
        title: "Take the fictional tablet",
        instructions: "Take once daily after breakfast.",
        priority: "NORMAL",
        sourceText,
        assignedTo: "patient",
        reviewRequired: false,
        payload: { schedule: "Once daily after breakfast" },
      },
    ],
  });
  await providerCaller.carePlan.activate({ carePlanId: draft.carePlanId });

  const patientCaller = appRouter.createCaller({
    db,
    user: {
      id: patient.id,
      email,
      name: patient.name,
      role: "patient",
      status: "active",
      patientId: patient.id,
      uhid: patient.uhid,
    },
  });
  const next = await patientCaller.patient.nextAction({ patientId: patient.id });
  if (next.action?.title !== "Take the fictional tablet") {
    throw new Error("Activated Hospital Care data was not visible on the Patient dashboard.");
  }

  console.log("UHID registration, OTP linking, and Patient Care visibility smoke test passed.");
} finally {
  if (patientId) {
    await db.delete(actionEvents).where(eq(actionEvents.patientId, patientId));
    await db.delete(carePlans).where(eq(carePlans.patientId, patientId));
    await db.delete(sourceDocuments).where(eq(sourceDocuments.patientId, patientId));
    await db
      .delete(providerPatientAssignments)
      .where(eq(providerPatientAssignments.patientId, patientId));
    await db.delete(patients).where(eq(patients.id, patientId));
  }
  await db.delete(users).where(eq(users.email, email));
}
