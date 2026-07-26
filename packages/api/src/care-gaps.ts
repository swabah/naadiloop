import type { ActionStatus } from "./patient-actions";

export type CareGapRule = "CG-1" | "CG-2" | "CG-3" | "CG-4" | "CG-5";
export type DashboardSection = "requiresAttention" | "awaitingReview" | "overdue" | "onTrack";

export interface CareGapAction {
  id: string;
  type: "MEDICATION" | "TEST" | "REFERRAL" | "FOLLOW_UP";
  status: ActionStatus;
  dueDate: Date | null;
}

export interface CareGapReport {
  id: string;
  status: "AWAITING_REVIEW" | "REVIEWED";
}

export interface CareGapEvent {
  id: string;
  eventType:
    | "created"
    | "verified"
    | "activated"
    | "completed"
    | "skipped"
    | "reminder_requested"
    | "help_requested"
    | "review_started"
    | "reviewed"
    | "closed"
    | "follow_up_created"
    | "help_resolved"
    | "dose_taken"
    | "dose_skipped";
  timestamp: Date;
  notes: string | null;
}

export interface CareGap {
  rule: CareGapRule;
  reason: string;
  nextProviderAction: string;
  reportId?: string;
}

const incompleteForOverdue = new Set<ActionStatus>([
  "PENDING",
  "DUE",
  "AWAITING_REVIEW",
  "REVIEWED",
]);

export function evaluateCareGaps(
  input: {
    action: CareGapAction;
    reports: CareGapReport[];
    events: CareGapEvent[];
  },
  now: Date,
): CareGap[] {
  const gaps: CareGap[] = [];
  const overdue =
    input.action.dueDate !== null &&
    input.action.dueDate.getTime() < now.getTime() &&
    incompleteForOverdue.has(input.action.status);

  if (overdue) {
    gaps.push({
      rule: "CG-1",
      reason: "Care action is past its due date and is not complete or closed.",
      nextProviderAction: "Check whether the Patient needs support.",
    });
  }

  const awaitingReport = input.reports.find(
    (report) => report.status === "AWAITING_REVIEW" && input.action.status === "AWAITING_REVIEW",
  );
  if (awaitingReport) {
    gaps.push({
      rule: "CG-2",
      reason: "Report awaiting Provider review.",
      nextProviderAction: "Review the returned report and communicate the next step.",
      reportId: awaitingReport.id,
    });
  }

  if (input.action.type === "REFERRAL" && overdue) {
    gaps.push({
      rule: "CG-3",
      reason: "Referral is past due without a recorded attendance outcome.",
      nextProviderAction: "Check referral progress with the Patient.",
    });
  }

  const latestHelpRequest = input.events
    .filter((event) => event.eventType === "help_requested")
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())[0];
  const helpWasResolved =
    latestHelpRequest &&
    input.events.some(
      (event) =>
        event.eventType === "help_resolved" &&
        event.timestamp.getTime() >= latestHelpRequest.timestamp.getTime(),
    );
  if (latestHelpRequest && !helpWasResolved) {
    gaps.push({
      rule: "CG-4",
      reason: "Patient requested support.",
      nextProviderAction: "Respond to the Patient's support request.",
    });
  }

  if (input.action.type === "MEDICATION") {
    const outcomes = input.events
      .filter((event) =>
        ["completed", "skipped", "reminder_requested", "dose_taken", "dose_skipped"].includes(
          event.eventType,
        ),
      )
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, 2);
    if (
      outcomes.length === 2 &&
      outcomes.every(
        (event) =>
          event.eventType === "skipped" ||
          event.eventType === "dose_skipped" ||
          event.eventType === "reminder_requested",
      )
    ) {
      gaps.push({
        rule: "CG-5",
        reason: "Two consecutive medication outcomes were not confirmed as taken.",
        nextProviderAction: "Check whether the Patient needs medication support.",
      });
    }
  }

  return gaps;
}

export function dashboardSectionFor(gaps: CareGap[]): DashboardSection {
  if (gaps.some((gap) => gap.rule === "CG-4" || gap.rule === "CG-5")) {
    return "requiresAttention";
  }
  if (gaps.some((gap) => gap.rule === "CG-2")) return "awaitingReview";
  if (gaps.some((gap) => gap.rule === "CG-1" || gap.rule === "CG-3")) return "overdue";
  return "onTrack";
}
