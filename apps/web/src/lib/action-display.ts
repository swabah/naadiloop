export const actionTypeLabels = {
  MEDICATION: "Medication",
  TEST: "Test",
  REFERRAL: "Referral",
  FOLLOW_UP: "Follow-up",
} as const;

export const actionStateLabels = {
  overdue: "Overdue",
  due: "Due now",
  upcoming: "Upcoming",
  completed: "Completed",
  awaiting_review: "Awaiting Provider review",
  reviewed: "Reviewed",
  closed: "Closed",
} as const;

export function formatActionDate(value?: string | null): string {
  if (!value) return "No deadline stated";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}
