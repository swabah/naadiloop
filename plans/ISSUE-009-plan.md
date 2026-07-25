# Plan — ISSUE-009: Report Review & Loop Closure

## Goal

Make Provider report review the second explicit human gate and close a review-bearing loop only
after completion, review, and next-step communication are all recorded.

## Interface first

`care_actions.nextStepCommunicated` records the final closure condition and
`care_actions.parentActionId` links Provider-authored follow-ups.

```ts
canCloseAction({ completed, reviewRequired, reviewed, nextStepCommunicated }) -> boolean
provider.reportDetails({ reportId })
provider.reviewReport({ reportId, comment?, followUp? })
provider.createFollowUp({ carePlanId, parentActionId?, action })
```

Reviewing an awaiting report explicitly communicates the next step (the optional comment or a
standard reviewed message), creates an optional verified FOLLOW_UP in the active plan, and batches
Report, action, follow-up, and events atomically.

## Implementation

1. Add closure-policy helper and invalid-shortcut tests.
2. Add explicit communication and parent linkage fields to Drizzle.
3. Implement Provider-owned report detail, review, and follow-up procedures.
4. Use Neon HTTP batches for Report/action updates and reviewed/follow-up/closed events.
5. Replace report placeholder with context, demo file link, optional comment/follow-up, explicit
   gate control, loading/error/success states, and dashboard invalidation.

## Verification

- Only awaiting reports review; comment stays optional.
- Review and optional follow-up write all rows/events atomically.
- Pure tests prove all closure conditions and non-review behavior.
- Patient polls reveal the closed original action and any new follow-up.
