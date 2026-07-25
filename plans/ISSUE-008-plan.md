# Plan — ISSUE-008: Provider Dashboard & Care Gaps

## Goal

Surface deterministic operational gaps to the Provider on every read, without persisting OVERDUE or
making medical judgments.

## Interface first

Pure evaluators consume plain action/report/event snapshots and emit rule ids:

```ts
evaluateCareGaps(input, now) -> CareGap[]
partitionDashboard(items) -> {
  requiresAttention, awaitingReview, overdue, onTrack
}
```

CG-5 is documented as the latest two medication outcome events both being unconfirmed
(`skipped` or `reminder_requested`). Dashboard partition precedence is Requires attention,
Awaiting review, Overdue, On track, so every action has one primary section; `listCareGaps`
preserves all traceable rule matches.

## Implementation

1. Add pure CG-1…CG-5 evaluators and exhaustive boundary tests.
2. Query active, verified actions with Patient, reports, and events on every read.
3. Include Patient-level help events through their explicit Patient link.
4. Implement dashboard and care-gap procedures with operational reasons and next actions.
5. Replace the dashboard placeholder with four sections, counts, links, retry, empty, and polling.

## Verification

- Unit tests cover every rule, exact due-time boundaries, completed/closed exclusions, CG-5 event
  ordering, Patient-level help, and partition uniqueness.
- Seeded overdue referral and report appear when the seeded plan is active.
- Copy contains no diagnosis, prognosis, risk score, or autonomous urgency.
