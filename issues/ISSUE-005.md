# ISSUE-005 — Verify Care Plan & Activation (Human Gate #1)

**Blocked by:** 004 (Document Input & AI Extraction)
**PRD refs:** §5, §6.2 (US-4/US-5), §7.1, §8.2–8.3, §9.2, §10, §14, §18

## Why

AI output is only a proposal. A Provider must be able to inspect provenance, correct the proposal, and explicitly activate it before any Care action becomes visible to the Patient. This is the product's first non-negotiable human gate.

## Scope

### Backend / Logic scope

- Implement `carePlan.verify` to create or update a draft Care plan and its editable Care actions.
- Support adding, editing, and deleting draft actions before verification.
- Validate action type, title, instructions, due date, priority, review requirement, and source text.
- Require `sourceText` to map to the associated Source Document.
- Write verification events in the same database operation as verification state changes.
- Implement `carePlan.activate`.
- Reject activation unless every remaining action is verified and the caller is the seeded Provider associated with the plan.
- Write activation events atomically and expose only verified actions belonging to an active Care plan.

### Frontend / UI scope

- Replace the verification placeholder with editable action cards.
- Show type, title, instructions, due date, priority, assignee, review requirement, and linked source sentence.
- Provide add, edit, and delete controls before activation.
- Visually reserve the `gate` color for this human-gate moment.
- Require an explicit “Activate care journey” action and show validation failures before submission.

## Acceptance Criteria

- [ ] Extracted actions arrive as editable draft cards.
- [ ] The Provider can add, edit, and delete actions before activation.
- [ ] Each action visibly displays its source sentence.
- [ ] Saving verification marks the final action set verified and writes corresponding Action events.
- [ ] Activation is rejected if any action is unverified.
- [ ] Activation writes Action events in the same transaction as the plan state change.
- [ ] Draft or merely verified plans are absent from Patient queries.
- [ ] After explicit activation, the Patient sees the journey on the next poll.
- [ ] The reference demo allows one due date to be corrected before activation.

## Risks / Open Questions

- Verification and activation affect several rows; partial writes must not leave a mixed visible/hidden plan.
- The schema uses `active` while some PRD prose says `activated`; code and API responses must choose one canonical stored value while UI copy may say “activated.”

