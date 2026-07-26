import assert from "node:assert/strict";
import test from "node:test";
import {
  helpRequestSchema,
  medicationActionSchema,
  patientLinkSchema,
  patientLookupSchema,
  registerInputSchema,
  reviewReportSchema,
  uploadReportSchema,
} from "./schemas";

test("medication schedules require provider-confirmed frequency, times, and start date together", () => {
  const base = {
    type: "MEDICATION" as const,
    title: "Example medicine",
    instructions: "Take as prescribed",
    priority: "NORMAL" as const,
    sourceText: "Take as prescribed",
  };
  assert.equal(
    medicationActionSchema.safeParse({
      ...base,
      payload: {
        frequencyPerDay: 3,
        doseTimes: ["08:00", "14:00", "20:00"],
        startDate: "2026-07-26",
        durationDays: 7,
      },
    }).success,
    true,
  );
  assert.equal(
    medicationActionSchema.safeParse({
      ...base,
      payload: { frequencyPerDay: 3, doseTimes: ["08:00", "20:00"] },
    }).success,
    false,
  );
});

test("Patient-level help is valid without a Care action", () => {
  const result = helpRequestSchema.safeParse({
    patientId: "20000000-0000-4000-8000-000000000001",
    kind: "transport",
  });
  assert.equal(result.success, true);
});

test("help rejects an untraceable request with neither Patient nor action", () => {
  const result = helpRequestSchema.safeParse({ kind: "provider" });
  assert.equal(result.success, false);
});

test("Patient registration requires a phone and a 12-digit Aadhaar number", () => {
  assert.equal(
    registerInputSchema.safeParse({
      name: "Fictional Patient",
      email: "patient@example.test",
      password: "password123",
      phone: "+91 90000 00000",
      aadhaarNumber: "123456789012",
      role: "patient",
    }).success,
    true,
  );
});

test("Patient registration rejects a missing consent phone", () => {
  assert.equal(
    registerInputSchema.safeParse({
      name: "Fictional Patient",
      email: "patient@example.test",
      password: "password123",
      aadhaarNumber: "123456789012",
      role: "patient",
    }).success,
    false,
  );
});

test("Patient registration rejects a missing or malformed Aadhaar number", () => {
  const patient = {
    name: "Fictional Patient",
    email: "patient@example.test",
    password: "password123",
    phone: "+91 90000 00000",
    role: "patient" as const,
  };
  assert.equal(registerInputSchema.safeParse(patient).success, false);
  assert.equal(
    registerInputSchema.safeParse({ ...patient, aadhaarNumber: "12345678901" }).success,
    false,
  );
});

test("UHID lookup normalizes case and linking requires six OTP digits", () => {
  assert.equal(patientLookupSchema.parse({ uhid: "uhid-0000000001" }).uhid, "UHID-0000000001");
  assert.equal(
    patientLinkSchema.safeParse({
      uhid: "UHID-0000000001",
      otp: "000000",
    }).success,
    true,
  );
  assert.equal(
    patientLinkSchema.safeParse({
      uhid: "UHID-0000000001",
      otp: "00000",
    }).success,
    false,
  );
});

test("report review remains valid without an optional comment or follow-up", () => {
  const result = reviewReportSchema.safeParse({
    reportId: "60000000-0000-4000-8000-000000000001",
  });
  assert.equal(result.success, true);
});

test("report metadata is bounded in demo mode", () => {
  const actionId = "50000000-0000-4000-8000-000000000002";
  assert.equal(
    uploadReportSchema.safeParse({
      actionId,
      file: { name: "cbc.pdf", type: "application/pdf", size: 42_000 },
    }).success,
    true,
  );
  assert.equal(
    uploadReportSchema.safeParse({
      actionId,
      file: { name: "too-large.pdf", type: "application/pdf", size: 10_000_001 },
    }).success,
    false,
  );
});
