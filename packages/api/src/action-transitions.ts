import type { ActionStatus } from "./patient-actions";

export type ActionType = "MEDICATION" | "TEST" | "REFERRAL" | "FOLLOW_UP";
export type PatientOutcome = "completed" | "taken" | "skipped" | "remind" | "help";

export type TransitionResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "BAD_REQUEST" | "CONFLICT"; message: string };

export function patientOutcomeTransition(
  action: { type: ActionType; status: ActionStatus },
  outcome: PatientOutcome,
): TransitionResult<{
  nextStatus: ActionStatus;
  eventType: "completed" | "skipped" | "reminder_requested" | "help_requested";
}> {
  if (outcome === "taken" && action.type !== "MEDICATION") {
    return {
      ok: false,
      code: "BAD_REQUEST",
      message: "Taken is available only for medication Care actions.",
    };
  }
  if ((outcome === "skipped" || outcome === "remind") && action.type !== "MEDICATION") {
    return {
      ok: false,
      code: "BAD_REQUEST",
      message: `${outcome === "skipped" ? "Skipped" : "Remind"} is available only for medication Care actions.`,
    };
  }
  if (outcome === "help") {
    return {
      ok: true,
      value: { nextStatus: action.status, eventType: "help_requested" },
    };
  }
  if (["COMPLETED", "AWAITING_REVIEW", "REVIEWED", "CLOSED"].includes(action.status)) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "This Care action has already been completed.",
    };
  }
  if (outcome === "skipped") {
    return { ok: true, value: { nextStatus: action.status, eventType: "skipped" } };
  }
  if (outcome === "remind") {
    return {
      ok: true,
      value: { nextStatus: action.status, eventType: "reminder_requested" },
    };
  }
  return {
    ok: true,
    value: { nextStatus: "COMPLETED", eventType: "completed" },
  };
}

export function reportUploadTransition(action: {
  type: ActionType;
  status: ActionStatus;
}): TransitionResult<{ nextStatus: "AWAITING_REVIEW" }> {
  if (action.type !== "TEST") {
    return {
      ok: false,
      code: "BAD_REQUEST",
      message: "Reports can only be uploaded for a TEST Care action.",
    };
  }
  if (["AWAITING_REVIEW", "REVIEWED", "CLOSED"].includes(action.status)) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "A report has already been returned for this Care action.",
    };
  }
  return { ok: true, value: { nextStatus: "AWAITING_REVIEW" } };
}
