import assert from "node:assert/strict";
import test from "node:test";
import { helpRequestSchema, reviewReportSchema, uploadReportSchema } from "./schemas";

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

test("report review remains valid without an optional comment or follow-up", () => {
  const result = reviewReportSchema.safeParse({
    reportId: "60000000-0000-4000-8000-000000000001",
  });
  assert.equal(result.success, true);
});

test("report URLs remain strict even in demo mode", () => {
  assert.equal(
    uploadReportSchema.safeParse({
      actionId: "50000000-0000-4000-8000-000000000002",
      fileUrl: "not-a-url",
    }).success,
    false,
  );
});
