# ISSUE-010 — Edge Cases & Error Handling

**Blocked by:** 009 (Report Review & Loop Closure)
**PRD refs:** §14, §15, §19

## Why

The demo's trust story depends on failures being explicit and state transitions remaining correct. This issue hardens the in-scope paths that could otherwise bypass a human gate, lose an Action event, or leave the UI in an unexplained state.

## Scope

### Backend / Logic scope

- Audit every mutation against the unified state-transition policy.
- Enforce all PRD §14 rejection and fallback cases.
- Make state changes and Action-event writes atomic.
- Return stable, plain-language tRPC errors for UI handling.
- Add tests for invalid activation, invalid report upload, repeated review/completion, extraction parse failure, due-date behavior, and help without a current action.
- Keep explicitly deferred production hardening out of scope: concurrency controls, rate limiting, large payload ceilings, and production file validation.

### Frontend / UI scope

- Add actionable error, retry, loading, and empty states to all critical demo screens.
- Prevent accidental double submission while mutations are pending.
- Preserve Provider edits after recoverable extraction/activation errors where practical.
- Make error copy calm and specific without exposing internal stack traces.

## Acceptance Criteria

- [ ] AI parse failure after one retry presents Retry and manual-entry options.
- [ ] Activation with any unverified action is rejected.
- [ ] A report against a non-TEST action is rejected.
- [ ] A past-due incomplete action derives as overdue without an enum transition.
- [ ] Report review without a comment remains valid but still requires explicit Provider review.
- [ ] Patient-level help without an action is recorded and surfaced.
- [ ] Repeated mutations do not create contradictory states or silent duplicate events.
- [ ] Every critical UI route has loading, empty, and error behavior.
- [ ] No state-changing error leaves a row changed without its corresponding event.
- [ ] Deferred production hardening is documented rather than partially implied.

## Risks / Open Questions

- The PRD sentence describing completion before/after `DUE` is ambiguous around “SKIPPED semantics.” The implementation plan must define the expected transition table and test it consistently.

