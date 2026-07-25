import assert from "node:assert/strict";
import test from "node:test";
import { canCloseAction } from "./closure-policy";

test("review-bearing actions require completion, review, and communication", () => {
  assert.equal(
    canCloseAction({
      status: "AWAITING_REVIEW",
      reviewRequired: true,
      nextStepCommunicated: true,
    }),
    false,
  );
  assert.equal(
    canCloseAction({
      status: "REVIEWED",
      reviewRequired: true,
      nextStepCommunicated: false,
    }),
    false,
  );
  assert.equal(
    canCloseAction({
      status: "REVIEWED",
      reviewRequired: true,
      nextStepCommunicated: true,
    }),
    true,
  );
});

test("non-review actions omit only the review condition", () => {
  assert.equal(
    canCloseAction({
      status: "PENDING",
      reviewRequired: false,
      nextStepCommunicated: true,
    }),
    false,
  );
  assert.equal(
    canCloseAction({
      status: "COMPLETED",
      reviewRequired: false,
      nextStepCommunicated: false,
    }),
    false,
  );
  assert.equal(
    canCloseAction({
      status: "COMPLETED",
      reviewRequired: false,
      nextStepCommunicated: true,
    }),
    true,
  );
});
