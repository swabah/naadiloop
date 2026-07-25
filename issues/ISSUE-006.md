# ISSUE-006 — Patient Journey: Next Action & Timeline

**Blocked by:** 005 (Verify Care Plan & Activation)
**PRD refs:** §6.3 (US-6/US-7/US-8), §7.2, §8.2, §10.1, §13, §18

## Why

The Patient should never need to reinterpret a discharge document. The patient experience must answer one question immediately—“What do I do next?”—while still making the complete Care journey understandable.

## Scope

### Backend / Logic scope

- Implement `patient.nextAction`, `patient.journey`, and `patient.actionDetails`.
- Return only verified Care actions from active Care plans for the requested Patient.
- Define deterministic ordering by actionable status, due date, priority, and creation time.
- Return progress counts derived from the same visible action set as the timeline.
- Derive overdue and display-state flags without adding `OVERDUE` to the lifecycle enum.

### Frontend / UI scope

- Replace the Patient next-action, journey, and action-detail placeholders.
- Make one plain-language next action the dominant element on the Patient home screen.
- Render an ordered timeline with completed, pending, upcoming/locked, awaiting-review, reviewed, and closed presentation states.
- Display an accurate “X of Y completed” count and action instructions, deadline, and source.
- Poll at the PRD's demo interval so activation and later next-step changes appear without a manual reload.

## Acceptance Criteria

- [ ] The next action is selected deterministically from patient-visible actions.
- [ ] Draft and inactive plans never appear in any Patient response.
- [ ] The next-action sentence is understandable without medical-system jargon.
- [ ] The timeline and progress count use exactly the same visible action set.
- [ ] Each item links to its action-detail screen.
- [ ] Awaiting-review actions clearly tell the Patient that Provider review is pending.
- [ ] Empty, all-closed, loading, and API-error states are handled.
- [ ] Polling updates the Patient experience after Provider activation.
- [ ] The patient home remains usable at a phone-sized viewport.

## Risks / Open Questions

- “Locked” is a presentation state, not a database lifecycle state; it must be derived consistently.
- Priority must not be presented as an AI-generated clinical judgment.

