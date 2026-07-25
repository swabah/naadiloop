import type { ActionStatus } from "./patient-actions";

export interface ClosureInput {
  status: ActionStatus;
  reviewRequired: boolean;
  nextStepCommunicated: boolean;
}

export function isCompletionRecorded(status: ActionStatus): boolean {
  return ["COMPLETED", "AWAITING_REVIEW", "REVIEWED", "CLOSED"].includes(status);
}

export function isReviewRecorded(status: ActionStatus): boolean {
  return status === "REVIEWED" || status === "CLOSED";
}

export function canCloseAction(input: ClosureInput): boolean {
  return (
    isCompletionRecorded(input.status) &&
    (!input.reviewRequired || isReviewRecorded(input.status)) &&
    input.nextStepCommunicated
  );
}
