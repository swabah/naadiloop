# ISSUE-008 — Provider Dashboard & Care-Gap Detection

**Blocked by:** 007 (Action Completion, Report Upload & Help Request)
**PRD refs:** §6.5 (US-12), §6.6 (US-15), §7.1, §7.3, §8.1, §10.1, §18

## Why

Silent failure is the product's core failure mode. The system must deterministically surface stalled Care actions to the Provider without pretending to diagnose the Patient or predict clinical risk.

## Scope

### Backend / Logic scope

- Implement pure, testable Care-gap evaluators for:
  - overdue action;
  - unreviewed report;
  - incomplete referral;
  - Patient needs support;
  - medication adherence warning.
- Evaluate rules on every dashboard/list read using the current time; do not persist `OVERDUE` as an action status.
- Implement `provider.dashboard` and `provider.listCareGaps`.
- Partition dashboard items into Requires attention, Awaiting review, Overdue, and On track without silently dropping or double-counting actions.
- Keep rule output operational and traceable to the underlying action/event data.

### Frontend / UI scope

- Replace the Provider dashboard placeholder with the four required sections.
- Show counts, Patient context, due date/status, reason for flagging, and the relevant next Provider action.
- Link report items to Provider review and Patient items to their journey/context.
- Use operational wording such as “report awaiting review” and “referral overdue,” never diagnosis, prognosis, or autonomous urgency language.
- Poll or refresh frequently enough for the on-stage Patient-to-Provider switch.

## Acceptance Criteria

- [ ] CG-1 flags a past-due action unless it is completed or closed.
- [ ] CG-2 flags every uploaded report whose action is `AWAITING_REVIEW`.
- [ ] CG-3 flags a referral not attended before its due date.
- [ ] CG-4 flags Patient help requests, including requests without a current action.
- [ ] CG-5 uses a documented deterministic event rule for two consecutive unconfirmed medication doses/outcomes.
- [ ] Unit tests cover boundary times, completed exclusions, and each Care-gap rule.
- [ ] All eligible actions appear in exactly the appropriate dashboard section(s), with intentional overlap documented if any.
- [ ] The seeded overdue referral and awaiting-review report are visible on first load.
- [ ] Dashboard copy contains no medical judgment or risk score.
- [ ] Refreshing/re-polling detects new Patient events without a server restart.

## Risks / Open Questions

- The MVP is not a full medication scheduler. CG-5 must be defined from available Patient outcome events, not invented dose times.
- “Requires attention” may aggregate help and adherence signals while overdue and review remain separate queues; any overlap must be explicit.

