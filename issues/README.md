# Issue Backlog

This backlog decomposes `PRD.md` into a buildable, dependency-ordered sequence. It exists because TradeRoute's hero flow is genuinely a pipeline — you cannot style a comparison card before the journey data it displays exists, and you cannot wire a slider to a recommendation before the recommendation logic exists. The chain below encodes that build order explicitly so nobody starts an issue whose inputs don't exist yet.

## How an issue is structured

Every issue in this directory covers **one deliverable slice**, and every slice has two halves:

- **Backend / Logic scope** — TradeRoute's MVP has no server (see PRD §11), so "backend" here means the non-visual layer: TypeScript types, calculation functions, data loaders, hooks, and state wiring. It's the code a screen reader — or a unit test — touches without ever rendering a pixel.
- **Frontend / UI scope** — the components, layout, and interaction that consume that logic and put it in front of a user.

Splitting every issue this way mirrors the PRD's own separation of concerns (§7 Business Logic vs. §6 Screens) and means one person can pick up the logic half while another styles the UI half, as long as they agree on the shape of the data crossing between them first.

## Dependency chain

Each issue is **blocked by exactly the issue before it** — a strict, single-threaded critical path rather than a tangle of cross-dependencies. This is a deliberate hackathon-scope choice: in a 4-hour build, an issue backlog that requires three other tickets in flight simultaneously before you can start is a coordination tax the team can't afford. When an issue says "Blocked by: ISSUE-004," its plan should not begin until ISSUE-004 is in `done/`.

In practice, a team of four can still work in parallel — see `workflow.md` for how downstream issues can be *planned* ahead of time even while blocked, so the moment a blocker clears, the next dev starts implementing immediately instead of starting to think.

| # | Issue | Blocked by | PRD refs |
|---|---|---|---|
| 001 | Project Scaffold, Design Tokens & Data Contracts | — (foundational) | §11, §12 |
| 002 | Corridor Data, Geocoding & Search Input | 001 | §6.2, §8 |
| 003 | Driving Cost Calculator & Journey Assembly | 002 | §6.3, §7.1, §8 |
| 004 | App State, Comparison Cards & Results Section | 003 | §6.4, §5 (US-1, US-3) |
| 005 | Tradeoff Engine & Recommendation Logic | 004 | §7.2 |
| 006 | Value-of-Time Slider | 005 | §6.6, §5 (US-4) |
| 007 | Tradeoff Scatter Plot | 006 | §6.5, §5 (US-5) |
| 008 | Detail Modal — Timeline & Cost Breakdown | 007 | §6.7, §5 (US-6) |
| 009 | Edge Cases & Error Handling | 008 | §9 |
| 010 | Responsive Layout & Accessibility | 009 | §10.2, §10.3 |
| 011 | Supporting Modals & Footer | 010 | §6.1, §6.8, §6.9 |
| 012 | Motion & Animation Polish | 011 | (spec §8.3) |
| 013 | Demo Data Validation & Deployment | 012 | §8.3, §13, §16, §18 |

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
