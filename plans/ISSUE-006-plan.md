# Plan — ISSUE-006: Patient Journey, Next Action & Timeline

## Goal

Give the Patient one plain-language next step and a complete, consistently ordered view of the
active Care journey without exposing draft or inactive plans.

## Interface first

The existing procedures are implemented without changing their inputs:

```ts
patient.nextAction({ patientId }) -> { action, progress, allClosed }
patient.journey({ patientId }) -> { actions, progress }
patient.actionDetails({ actionId }) -> { action, patient }
```

All three use one shared visible-action loader (`plan.status = active`, `action.verified = true`) and
one deterministic projection that derives overdue, display state, locked state, and serializable
dates. Ordering is: actionable/display rank, due date, explicit priority, creation time, stable id.

## Implementation

1. Add pure Patient-action ordering and display helpers with boundary tests.
2. Add the shared active/verified action query and Patient ownership guard.
3. Implement next-action, journey, and detail procedures from the same projected set.
4. Replace Patient placeholders with mobile-first loading, empty, closed, error, next-action,
   timeline, and detail screens.
5. Poll next-action and journey every five seconds and link every item to details.

## Verification

- Tests cover draft/inactive exclusion at the query boundary, ordering ties, overdue derivation,
  awaiting-review copy state, progress counts, and all-closed behavior.
- `pnpm check`, `pnpm typecheck`, and `pnpm build` pass.
- UI uses no clinical-priority inference language.

## Risks

Issue 005 is not yet implemented on `main`; this slice consumes its canonical `active` and
`verified` fields without implementing verification or activation.
