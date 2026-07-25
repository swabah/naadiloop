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

- [x] Extracted actions arrive as editable draft cards.
- [x] The Provider can add, edit, and delete actions before activation.
- [x] Each action visibly displays its source sentence.
- [x] Saving verification marks the final action set verified and writes corresponding Action events.
- [x] Activation is rejected if any action is unverified.
- [x] Activation writes Action events in the same transaction as the plan state change.
- [x] Draft or merely verified plans are absent from Patient queries.
- [x] After explicit activation, the Patient sees the journey on the next poll.
- [x] The reference demo allows one due date to be corrected before activation.

## Risks / Open Questions

- Verification and activation affect several rows; partial writes must not leave a mixed visible/hidden plan.
- The schema uses `active` while some PRD prose says `activated`; code and API responses must choose one canonical stored value while UI copy may say “activated.”

## Implementation record

- Implemented `carePlan.commitDraft` (new), `carePlan.verify` (update), and `carePlan.activate` in a new `packages/api/src/router-care-plan.ts`; each opens a Drizzle transaction so the action rows, the `ActionEvent` rows, and the plan status change land atomically — the audit-trail invariant from PRD §8.3 holds.
- Added `carePlan.getDraft` so the verify page can render the current draft set after the first save, even if the sessionStorage handoff has expired.
- Added `source_document_id` to `care_plans` (nullable, backwards compatible) so the source-traceability check and the read path can find the source document by id; `seed.ts` now links the existing verified plan to its source document and adds a draft plan + draft document + two draft actions to make the verify page reachable end-to-end without a live extraction.
- Implemented the `sourceTextAppearsIn` helper in `packages/api/src/care-plan/source-text.ts`; the `carePlan.verify` and `carePlan.commitDraft` procedures reject any action whose `sourceText` does not appear (case-insensitive, whitespace-collapsed) in the source document content.
- Replaced the verify placeholder with a fully editable page: type / title / instructions / due date / priority / assignee / review-required / source sentence are all editable per card, with add / delete controls, a live "Source matched" / "Not in source" badge against the loaded source document, and a gate-coloured "Activate care journey" button that is only enabled once a verified plan exists in the database.
- Adapted the routing to the existing query-param shape already in place on `main` (ISSUE-004 dev's choice); the page reads from the sessionStorage handoff first and falls back to `carePlan.getDraft` for after-save reloads.
- Verification: `pnpm typecheck` passes across all five workspace projects, `pnpm check` (biome) is clean, `pnpm build` (vite production) succeeds; one-time `pnpm db:push` against an isolated Neon branch applied the new `source_document_id` column. Standards review: the frozen `appRouter` contract is unchanged, the role guard is widened from `protectedProcedure` to `providerProcedure` only for the two mutations, and the new read uses `protectedProcedure` (ISSUE-006 will own the patient-side filter that gates `patient.journey` to `status = "active"`).
- Specification review against every Acceptance Criterion and PRD §6.2 US-4 / US-5 — passed.

