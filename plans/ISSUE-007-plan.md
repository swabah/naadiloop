# Plan — ISSUE-007: Action Completion, Report Upload & Help

## Goal

Let Patients advance visible Care actions, return a test report, or ask for support while every
accepted state change writes its audit event atomically.

## Interface first

```ts
patient.markCompleted({ actionId, outcome, notes? })
patient.skipDose({ actionId, notes? })
patient.uploadReport({ actionId, fileUrl })
patient.requestHelp({ actionId?, patientId?, kind, notes? })
```

`outcome` supports `completed | taken | skipped | remind | help`. Patient-level help requires a
`patientId` when no action is supplied. `action_events.careActionId` becomes nullable and receives a
nullable `patientId`; `reminder_requested` is an explicit operational event.

## Implementation

1. Update Drizzle schema for Patient-level events and reminder audit events.
2. Add one Patient-visible action guard shared by all mutations.
3. Implement permitted transitions with generated ids and Neon HTTP batch transactions.
4. Restrict report creation to TEST actions and batch report, status, and review-start event.
5. Build type-appropriate action controls, demo-safe report selection, and support-request UI.
6. Invalidate next-action, journey, and detail queries after success; disable pending controls.

## Verification

- Tests cover permitted/rejected transitions, non-TEST report rejection, Patient-level help, and
  repeated terminal mutations.
- UI labels mock report URLs honestly and renders awaiting-review immediately.
- Full check/type/build suite passes.

## Risks

The MVP does not schedule doses. A reminder is only an event, and adherence detection is derived
from recorded outcomes rather than invented dose times.
