import assert from "node:assert/strict";
import test from "node:test";
import {
  type CareGapAction,
  type CareGapEvent,
  dashboardSectionFor,
  evaluateCareGaps,
} from "./care-gaps";

const now = new Date("2026-07-25T12:00:00.000Z");
const baseAction: CareGapAction = {
  id: "action",
  type: "TEST",
  status: "PENDING",
  dueDate: new Date(now.getTime() - 1),
};
const event = (id: string, eventType: CareGapEvent["eventType"], offset = 0): CareGapEvent => ({
  id,
  eventType,
  timestamp: new Date(now.getTime() + offset),
  notes: null,
});

test("CG-1 uses a strict past boundary and excludes completed and closed", () => {
  assert.deepEqual(
    evaluateCareGaps({ action: baseAction, reports: [], events: [] }, now).map((gap) => gap.rule),
    ["CG-1"],
  );
  assert.equal(
    evaluateCareGaps({ action: { ...baseAction, dueDate: now }, reports: [], events: [] }, now)
      .length,
    0,
  );
  for (const status of ["COMPLETED", "CLOSED"] as const) {
    assert.equal(
      evaluateCareGaps({ action: { ...baseAction, status }, reports: [], events: [] }, now).length,
      0,
    );
  }
});

test("CG-2 flags an awaiting report only with the matching action state", () => {
  const gaps = evaluateCareGaps(
    {
      action: { ...baseAction, status: "AWAITING_REVIEW", dueDate: null },
      reports: [{ id: "report", status: "AWAITING_REVIEW" }],
      events: [],
    },
    now,
  );
  assert.equal(gaps[0]?.rule, "CG-2");
  assert.equal(gaps[0]?.reportId, "report");
});

test("CG-3 flags an incomplete overdue referral", () => {
  const rules = evaluateCareGaps(
    { action: { ...baseAction, type: "REFERRAL" }, reports: [], events: [] },
    now,
  ).map((gap) => gap.rule);
  assert.deepEqual(rules, ["CG-1", "CG-3"]);
});

test("CG-4 flags support requests", () => {
  const gaps = evaluateCareGaps(
    {
      action: { ...baseAction, dueDate: null },
      reports: [],
      events: [event("help", "help_requested")],
    },
    now,
  );
  assert.equal(gaps[0]?.rule, "CG-4");
});

test("CG-5 requires the two latest medication outcomes to be unconfirmed", () => {
  const action = { ...baseAction, type: "MEDICATION" as const, dueDate: null };
  assert.equal(
    evaluateCareGaps(
      {
        action,
        reports: [],
        events: [event("skip", "skipped", 2), event("remind", "reminder_requested", 1)],
      },
      now,
    )[0]?.rule,
    "CG-5",
  );
  assert.equal(
    evaluateCareGaps(
      {
        action,
        reports: [],
        events: [event("taken", "completed", 2), event("skip", "skipped", 1)],
      },
      now,
    ).length,
    0,
  );
});

test("dashboard partition gives every action exactly one primary section by precedence", () => {
  assert.equal(
    dashboardSectionFor([
      { rule: "CG-1", reason: "overdue", nextProviderAction: "check" },
      { rule: "CG-4", reason: "help", nextProviderAction: "respond" },
    ]),
    "requiresAttention",
  );
  assert.equal(
    dashboardSectionFor([
      { rule: "CG-1", reason: "overdue", nextProviderAction: "check" },
      { rule: "CG-2", reason: "report", nextProviderAction: "review" },
    ]),
    "awaitingReview",
  );
  assert.equal(dashboardSectionFor([]), "onTrack");
});
