import assert from "node:assert/strict";
import test from "node:test";
import {
  helpRequestSchema,
  patientLinkSchema,
  patientLookupSchema,
  registerInputSchema,
  reviewReportSchema,
  uploadReportSchema,
} from "./schemas";

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

test("Patient registration requires a phone and does not collect Aadhaar", () => {
  assert.equal(
    registerInputSchema.safeParse({
      name: "Fictional Patient",
      email: "patient@example.test",
      password: "password123",
      phone: "+91 90000 00000",
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
      role: "patient",
    }).success,
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
