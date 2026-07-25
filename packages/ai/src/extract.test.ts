import assert from "node:assert/strict";
import test from "node:test";
import { extractCareActions } from "./index";

const source = [
  "Take Amlodipine 5 mg once daily after breakfast.",
  "Complete a CBC blood test tomorrow.",
  "Attend a cardiology consultation within three days.",
  "Return to the PHC for follow-up in seven days.",
].join(" ");

const fourActions = {
  actions: [
    {
      type: "MEDICATION",
      title: "Take Amlodipine",
      instructions: "Take 5 mg once daily after breakfast.",
      dueDate: null,
      priority: "NORMAL",
      sourceText: "Take Amlodipine 5 mg once daily after breakfast.",
    },
    {
      type: "TEST",
      title: "Complete CBC blood test",
      instructions: "Complete the CBC blood test.",
      dueDate: "2026-07-26T09:00:00.000Z",
      priority: "NORMAL",
      sourceText: "Complete a CBC blood test tomorrow.",
    },
    {
      type: "REFERRAL",
      title: "Attend cardiology consultation",
      instructions: "Attend the cardiology consultation.",
      dueDate: "2026-07-28T09:00:00.000Z",
      priority: "NORMAL",
      sourceText: "Attend a cardiology consultation within three days.",
    },
    {
      type: "FOLLOW_UP",
      title: "Return to the PHC",
      instructions: "Return for follow-up.",
      dueDate: "2026-08-01T09:00:00.000Z",
      priority: "NORMAL",
      sourceText: "Return to the PHC for follow-up in seven days.",
    },
  ],
};

test("accepts all four Care action types with required fields and traceable quotes", async () => {
  const actions = await extractCareActions({
    sourceText: source,
    now: new Date("2026-07-25T09:00:00.000Z"),
    request: async () => JSON.stringify(fourActions),
  });

  assert.deepEqual(
    actions.map((action) => action.type),
    ["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"],
  );
});

test("retries once after invalid JSON and then succeeds", async () => {
  let calls = 0;
  const actions = await extractCareActions({
    sourceText: source,
    request: async () => {
      calls += 1;
      return calls === 1 ? "not json" : JSON.stringify(fourActions);
    },
  });

  assert.equal(calls, 2);
  assert.equal(actions.length, 4);
});

test("stops after one retry when required output fields are missing", async () => {
  let calls = 0;
  await assert.rejects(
    extractCareActions({
      sourceText: source,
      request: async () => {
        calls += 1;
        return JSON.stringify({ actions: [{ type: "TEST" }] });
      },
    }),
    /invalid Care action structure/,
  );
  assert.equal(calls, 2);
});

test("rejects a source quote that is not present in the document", async () => {
  const invalid = structuredClone(fourActions);
  const firstAction = invalid.actions[0];
  assert.ok(firstAction);
  firstAction.sourceText = "A sentence invented by the model.";

  await assert.rejects(
    extractCareActions({
      sourceText: source,
      request: async () => JSON.stringify(invalid),
    }),
    /not traceable/,
  );
});
