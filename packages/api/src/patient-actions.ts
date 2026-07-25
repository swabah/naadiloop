export type ActionStatus =
  | "PENDING"
  | "DUE"
  | "COMPLETED"
  | "AWAITING_REVIEW"
  | "REVIEWED"
  | "CLOSED";

export interface PatientActionRecord {
  id: string;
  status: ActionStatus;
  dueDate: Date | null;
  priority: "NORMAL" | "URGENT";
  createdAt: Date;
}

export type PatientDisplayState =
  | "overdue"
  | "due"
  | "upcoming"
  | "completed"
  | "awaiting_review"
  | "reviewed"
  | "closed";

const progressStatuses = new Set<ActionStatus>([
  "COMPLETED",
  "AWAITING_REVIEW",
  "REVIEWED",
  "CLOSED",
]);

export function isActionOverdue(action: PatientActionRecord, now: Date): boolean {
  return (
    action.dueDate !== null &&
    action.dueDate.getTime() < now.getTime() &&
    action.status !== "COMPLETED" &&
    action.status !== "CLOSED"
  );
}

function actionRank(action: PatientActionRecord, now: Date): number {
  if (isActionOverdue(action, now)) return 0;
  switch (action.status) {
    case "DUE":
      return 1;
    case "PENDING":
      return 2;
    case "AWAITING_REVIEW":
      return 3;
    case "REVIEWED":
      return 4;
    case "COMPLETED":
      return 5;
    case "CLOSED":
      return 6;
  }
}

export function orderPatientActions<T extends PatientActionRecord>(actions: T[], now: Date): T[] {
  return [...actions].sort((left, right) => {
    const rankDifference = actionRank(left, now) - actionRank(right, now);
    if (rankDifference !== 0) return rankDifference;

    const leftDue = left.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const rightDue = right.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (leftDue !== rightDue) return leftDue - rightDue;

    if (left.priority !== right.priority) return left.priority === "URGENT" ? -1 : 1;

    const createdDifference = left.createdAt.getTime() - right.createdAt.getTime();
    if (createdDifference !== 0) return createdDifference;
    return left.id.localeCompare(right.id);
  });
}

export function getPatientDisplayState(
  action: PatientActionRecord,
  now: Date,
): PatientDisplayState {
  if (action.status === "CLOSED") return "closed";
  if (action.status === "REVIEWED") return "reviewed";
  if (action.status === "AWAITING_REVIEW") return "awaiting_review";
  if (action.status === "COMPLETED") return "completed";
  if (isActionOverdue(action, now)) return "overdue";
  if (action.status === "DUE") return "due";
  return "upcoming";
}

export function projectPatientJourney<T extends PatientActionRecord>(actions: T[], now: Date) {
  const ordered = orderPatientActions(actions, now);
  const firstActionableIndex = ordered.findIndex(
    (action) => action.status === "PENDING" || action.status === "DUE",
  );

  return {
    actions: ordered.map((action, index) => ({
      ...action,
      displayState: getPatientDisplayState(action, now),
      isOverdue: isActionOverdue(action, now),
      locked:
        firstActionableIndex >= 0 && index > firstActionableIndex && action.status === "PENDING",
    })),
    progress: {
      completed: ordered.filter((action) => progressStatuses.has(action.status)).length,
      total: ordered.length,
    },
  };
}

export function selectNextPatientAction<T extends PatientActionRecord>(
  actions: T[],
  now: Date,
): T | null {
  const ordered = orderPatientActions(actions, now);
  return (
    ordered.find((action) => action.status === "PENDING" || action.status === "DUE") ??
    ordered.find((action) => action.status === "AWAITING_REVIEW") ??
    null
  );
}
