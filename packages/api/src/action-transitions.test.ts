import assert from "node:assert/strict";
import test from "node:test";
import { patientOutcomeTransition, reportUploadTransition } from "./action-transitions";

test("completion reaches COMPLETED once and repeated completion is rejected", () => {
  assert.deepEqual(
    patientOutcomeTransition({ type: "FOLLOW_UP", status: "PENDING" }, "completed"),
    { ok: true, value: { nextStatus: "COMPLETED", eventType: "completed" } },
  );
  assert.equal(
    patientOutcomeTransition({ type: "FOLLOW_UP", status: "COMPLETED" }, "completed").ok,
    false,
  );
});

test("medication outcomes do not invent a dose scheduler transition", () => {
  assert.deepEqual(patientOutcomeTransition({ type: "MEDICATION", status: "DUE" }, "skipped"), {
    ok: true,
    value: { nextStatus: "DUE", eventType: "skipped" },
  });
  assert.deepEqual(patientOutcomeTransition({ type: "MEDICATION", status: "DUE" }, "remind"), {
    ok: true,
    value: { nextStatus: "DUE", eventType: "reminder_requested" },
  });
  assert.equal(patientOutcomeTransition({ type: "TEST", status: "DUE" }, "taken").ok, false);
  assert.equal(
    patientOutcomeTransition({ type: "MEDICATION", status: "CLOSED" }, "skipped").ok,
    false,
  );
});

test("report upload is restricted to TEST and cannot repeat", () => {
  assert.deepEqual(reportUploadTransition({ type: "TEST", status: "COMPLETED" }), {
    ok: true,
    value: { nextStatus: "AWAITING_REVIEW" },
  });
  assert.equal(reportUploadTransition({ type: "REFERRAL", status: "COMPLETED" }).ok, false);
  assert.equal(reportUploadTransition({ type: "TEST", status: "AWAITING_REVIEW" }).ok, false);
});
