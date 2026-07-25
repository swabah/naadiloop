# Issue Backlog

This backlog decomposes `PRD.md` into a buildable, dependency-ordered sequence. It exists because Naadi Loop's core mechanic is genuinely a pipeline built around two human gates — you cannot build the verification screen before extraction produces draft actions to verify, and you cannot build the review/loop-close screen before the patient journey exists to close a loop on. The chain below encodes that build order explicitly so nobody starts an issue whose inputs don't exist yet.

## How an issue is structured

Every issue in this directory covers **one deliverable slice**, and every slice has two halves:

- **Backend / Logic scope** — `packages/db` (schema), `packages/api` (tRPC procedures, zod schemas), `apps/server` (wiring), and `packages/ai` (extraction) — the non-visual layer a unit test touches without ever rendering a pixel.
- **Frontend / UI scope** — the `apps/web` components, layout, and interaction that consume that logic and put it in front of a patient or provider.

Splitting every issue this way mirrors the PRD's own separation of concerns (§8 Business Logic vs. §7 Screens & UX Flows) and means one person can pick up the logic half while another styles the UI half, as long as they agree on the shape of the data crossing between them first — in practice, that shape is already frozen by ISSUE-001's `appRouter` contract.

## Dependency chain

Each issue is **blocked by exactly the issue before it** — a strict, single-threaded critical path rather than a tangle of cross-dependencies. This is a deliberate hackathon-scope choice: in a 4-hour build, an issue backlog that requires three other tickets in flight simultaneously before you can start is a coordination tax the team can't afford. When an issue says "Blocked by: ISSUE-004," its plan should not begin until ISSUE-004 is in `done/`.

In practice, a team of four can still work in parallel — see `workflow.md §5` for how downstream issues can be *planned* ahead of time even while blocked, so the moment a blocker clears, the next dev starts implementing immediately instead of starting to think.

| # | Issue | Blocked by | PRD refs | Status |
|---|---|---|---|---|
| 001 | Project Scaffold, Stack Wiring & Data Contracts | — (foundational) | §7, §8, §9, §10, §11, §12, §13, §15, §16 | done |
| 002 | Patient Management & Provider Shell | 001 | §4, §6.1 (US-1), §11 | — |
| 003 | Document Input & AI Extraction | 002 | §6.1 (US-2/US-3), §9, §11, §12.2 | — |
| 004 | Verify Care Plan & Activation (human gate #1) | 003 | §6.2 (US-4/US-5), §8.2, §11 | — |
| 005 | Patient Journey — Next Action & Timeline | 004 | §6.3 (US-6/US-7/US-8), §7.2, §11 | — |
| 006 | Action Completion, Report Upload & Help Request | 005 | §6.4 (US-9/US-10/US-11), §11 | — |
| 007 | Provider Dashboard & Care-Gap Detection | 006 | §6.6 (US-15), §8.1, §11 | — |
| 008 | Report Review & Loop Closure (human gate #2) | 007 | §6.5 (US-12/13/14), §8.2–8.3, §11 | — |
| 009 | Edge Cases & Error Handling | 008 | §14 | — |
| 010 | Responsive Layout, Branding & Loop Visualization | 009 | §13, §15, §12.1 | — |
| 011 | Demo Seed Data, Rehearsal & Deployment | 010 | §16, §17, §18, §19 | — |

PRD section numbers above refer to the root `PRD.md` (21 sections — the refined, canonical doc). `naadi-loop-prd.md` is an earlier source document with different section numbering; don't mix the two when citing refs in new issues.

**Never-cut set** (PRD §17): 003–008 cover the AI extraction, both human gates, the patient journey, and loop closure — the parts of the demo that can never be cut under time pressure. If behind schedule at the 2:30 mark, 009–011 are what compress first, matching PRD §17's own cut order.

## Lifecycle

```
issues/ISSUE-00X.md          ← the ticket: what & why, scoped FE + BE, acceptance criteria
        │
        │  when its blocker reaches done/, write the detailed plan:
        ▼
plans/ISSUE-00X-plan.md      ← the how: file-by-file steps, sequencing, test approach
        │
        │  implement against the plan, verify every acceptance criterion
        ▼
done/ISSUE-00X.md            ← both files moved here together once implementation is complete
done/ISSUE-00X-plan.md
```

An issue is only moved to `done/` when **every acceptance criterion in the issue file is verifiably true** — not when code merely exists. See `workflow.md` for the review gate that sits between "implemented" and "moved to done."
