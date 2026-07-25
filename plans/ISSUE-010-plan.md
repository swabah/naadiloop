# Plan — ISSUE-010: Edge Cases & Error Handling

## Goal

Harden the critical demo paths so failures are explicit, recoverable where possible, and never
leave state without its corresponding audit event.

## Interface first

All mutations use shared ownership and transition guards, stable plain-language `TRPCError`
messages, and Neon HTTP batch transactions for state/event writes. No concurrency-control,
rate-limit, binary-validation, or production-storage claims are introduced.

## Implementation

1. Audit every implemented mutation against the unified transition and closure policies.
2. Add regression tests for extraction retry, activation preconditions (when issue 005 lands),
   report type/state, repeated completion/review, past-due derivation, optional review comment,
   Patient-level help, and batch composition.
3. Ensure all critical Patient/Provider routes have loading, empty, error, retry, and pending-button
   protections.
4. Preserve local Provider text/comment edits after recoverable failures.
5. Document deferred production hardening in the completion record.

## Verification

- Complete unit, type, lint, and production-build suite passes.
- Browser bundle contains no server AI code or credential markers.
- Final manual review maps each issue 006–010 acceptance criterion to code/tests.

## Risks

Issue 005 activation hardening can only be regression-tested after that implementation lands on
`main`; final synchronization must reconcile and test it before publishing.
