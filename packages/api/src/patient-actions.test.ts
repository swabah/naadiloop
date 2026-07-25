import assert from "node:assert/strict";
import test from "node:test";
import {
  getPatientDisplayState,
  isActionOverdue,
  orderPatientActions,
  type PatientActionRecord,
  projectPatientJourney,
  selectNextPatientAction,
} from "./patient-actions";

const now = new Date("2026-07-25T12:00:00.000Z");
const action = (id: string, overrides: Partial<PatientActionRecord> = {}): PatientActionRecord => ({
  id,
  status: "PENDING",
  dueDate: new Date("2026-07-26T12:00:00.000Z"),
  priority: "NORMAL",
  createdAt: new Date("2026-07-20T12:00:00.000Z"),
  ...overrides,
});

test("overdue is derived only before the due instant and excludes completed and closed", () => {
  assert.equal(
    isActionOverdue(action("past", { dueDate: new Date(now.getTime() - 1) }), now),
    true,
  );
  assert.equal(isActionOverdue(action("equal", { dueDate: now }), now), false);
  assert.equal(
    isActionOverdue(
      action("complete", { dueDate: new Date(now.getTime() - 1), status: "COMPLETED" }),
      now,
    ),
    false,
  );
  assert.equal(
    isActionOverdue(
      action("closed", { dueDate: new Date(now.getTime() - 1), status: "CLOSED" }),
      now,
    ),
    false,
  );
});

test("ordering is deterministic by state, due date, priority, creation, and id", () => {
  const ordered = orderPatientActions(
    [
      action("closed", { status: "CLOSED" }),
      action("normal"),
      action("urgent", { priority: "URGENT" }),
      action("overdue", { dueDate: new Date(now.getTime() - 1) }),
      action("awaiting", { status: "AWAITING_REVIEW" }),
    ],
    now,
  );
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["overdue", "urgent", "normal", "awaiting", "closed"],
  );
});

test("journey projection uses one set for timeline and progress", () => {
  const journey = projectPatientJourney(
    [
      action("first"),
      action("second"),
      action("waiting", { status: "AWAITING_REVIEW" }),
      action("closed", { status: "CLOSED" }),
    ],
    now,
  );
  assert.equal(journey.actions.length, journey.progress.total);
  assert.equal(journey.progress.completed, 2);
  assert.equal(journey.actions.find((item) => item.id === "second")?.locked, true);
  assert.equal(
    getPatientDisplayState(action("waiting", { status: "AWAITING_REVIEW" }), now),
    "awaiting_review",
  );
});

test("next action prefers actionable work, then awaiting review, then all closed", () => {
  assert.equal(
    selectNextPatientAction([action("waiting", { status: "AWAITING_REVIEW" }), action("next")], now)
      ?.id,
    "next",
  );
  assert.equal(
    selectNextPatientAction([action("waiting", { status: "AWAITING_REVIEW" })], now)?.id,
    "waiting",
  );
  assert.equal(selectNextPatientAction([action("closed", { status: "CLOSED" })], now), null);
});
