# Naadi Loop — Project Workflow

This document is the operating manual for building Naadi Loop. `PRD.md` says what we're building and why; the `issues/` backlog says in what order; this document says _how a piece of work actually moves from idea to shipped code_, including which of the available skills to reach for at each stage. Read this once before picking up the first issue.

---

## 1. The core loop

Every unit of work in this project — from a hackathon feature to a post-hackathon roadmap item — moves through the same four stages:

```
issues/ISSUE-00X.md   →   plans/ISSUE-00X-plan.md   →   implementation   →   done/ISSUE-00X.md + plan
     (what & why)              (how, in order)          (code + review)         (verified record)
```

1. **Pick the next unblocked issue.** Check `issues/README.md`'s dependency table — an issue is only actionable once the issue it's "Blocked by" is sitting in `done/`.
2. **Write the plan.** Create `plans/ISSUE-00X-plan.md` before touching implementation code. See `plans/README.md` for what a plan must contain (interface first, then file-by-file steps, then verification approach).
3. **Implement against the plan**, using the skill guidance in §3 below for the _kind_ of work each part of the issue is.
4. **Review, then move to done.** Verify every acceptance criterion in the issue, run it through the review gate in §4, then `git mv` both the issue and its plan into `done/`.

Because the backlog is a strict linear chain (§2 of `issues/README.md`), at any moment there is exactly one issue that's actionable for implementation. That does **not** mean only one person can be productive — see §5 for how a 4-person team parallelizes agasinst a single-threaded backlog.

---

## 2. How the PRD, the issues, and the code relate

- `PRD.md` is the **decision record** — it holds the _why_ behind every requirement, and it doesn't change once an issue derived from it is in flight. If a plan seems to contradict the PRD, the PRD wins; open a discussion before overriding it.
- `issues/` is the **backlog** — one deliverable slice per file, each already scoped into backend/logic and frontend/UI halves, each pointing back at the specific PRD section it implements.
- `plans/` is **active work** — it should only ever contain plans for issues currently being built. An empty `plans/` directory is a healthy state, not a broken one.
- `done/` is the **build log** — a chronological, self-contained record that should let anyone reconstruct exactly what was built, in what order, and why, without touching git history.

If you find yourself needing to add a requirement that isn't in the PRD, add it to the PRD first (with its own "why," per the PRD's own conventions), _then_ write the issue. Code should never trace back to a requirement that only exists in someone's head.

---

## 3. Which skill to reach for, and when

Naadi Loop's build touches three different kinds of work — deterministic logic and state transitions, visual/UI design, and day-to-day debugging — and different available skills are suited to each. This section exists so nobody defaults to "just write the code" when a skill would produce a materially better result for that specific kind of work.

### 3.1 Pure logic and calculations → `tdd`

The care-gap rule evaluators (CG-1…CG-5, PRD §8.1) and the `actionStatus` state-machine transitions (PRD §10.1) are exactly the kind of code TDD is built for: pure functions with known, PRD-specified expected outputs — each rule's condition is already a test case, not just documentation (e.g. CG-1 "overdue" is `dueDate` passed AND `status` ≠ `COMPLETED`/`CLOSED`; loop closure per §8.2 requires completed AND reviewed AND next-step-communicated, all three, no shortcuts). Write the failing test from the PRD's stated conditions first, then implement to green. This matters more than usual here because these are the deterministic guarantees a judge might question live (PRD §8.1 — "operational alerts, not medical judgments") — a red-green-refactor trail is the fastest way to prove a rule is correct under pressure.

### 3.2 Something is broken or slow → `diagnosing-bugs`

When a loop gets stuck mid-transition (an action sits in `AWAITING_REVIEW` past when it should have closed), when a care-gap rule mis-fires or fails to fire on refresh, or when an edge case from ISSUE-009 resists a clean fix — don't guess-and-patch. Use the diagnosis loop to isolate root cause before changing code. A quick patch that papers over a wrong status transition is worse than a slow, correct one, given the product's entire premise is trustworthy loop closure.

### 3.3 Unsure whether a design or state model feels right → `prototype`

Before committing a plan for something genuinely uncertain — does the circular progress indicator read clearly at 2/6 vs. 6/6 completed? does the `gate` purple accent stay visually unmistakable against the teal primary at both human-gate moments? — build a disposable prototype to answer the question first, rather than baking the guess straight into a plan. This is cheaper than discovering the answer is wrong after ISSUE-007 is already in `done/`.

### 3.4 Keeping vocabulary and architecture consistent → `domain-modeling`

Naadi Loop's data model has precise, load-bearing terminology: `verified` vs. `activated`, "Care action" vs. "Report" vs. "ActionEvent," and the two human gates (verification, review) are _not_ interchangeable (PRD §10 and §21's glossary are explicit these stay visibly distinct). When a new issue or plan introduces a new term, or when it's unclear whether two things (e.g., a care-gap "flag" vs. an `ActionEvent`) are actually the same concept, use domain-modeling thinking to pin it down and record the decision — don't let two components silently drift toward different definitions of the same word.

### 3.5 Designing a component's interface before building it → `codebase-design`

Every plan's "interface first" step (see `plans/README.md`) is where this applies: before writing a screen's implementation, decide what data shape it consumes and what it exposes, the way a deep module should — simple to call, real logic hidden behind the interface. This is especially relevant at the `packages/api`'s `appRouter` seam (frozen in ISSUE-001) and the `CareAction`/`ActionEvent` write-together invariant (§8.3 — every status transition writes its event in the same procedure call), since nearly every later issue depends on both staying stable.

### 3.6 Visual design, layout, and component styling → `ui-ux-pro-max` skill family

For anything touching the actual pixels — card layout, the dashboard's four-section grid, the timeline's status badges, spacing, responsive behavior — use the `ui-ux-pro-max` and `ui-styling` skills rather than improvising. Naadi Loop's brand tokens are already fixed by PRD §13.3 (`primary` teal, `accent` amber, `gate` purple — reserved for the two human-gate moments only, never decorative — Inter + Fraunces) — treat these skills as the craft layer that applies those fixed tokens well (contrast, spacing rhythm, component states), not as a place to introduce new colors or typefaces. For the Recharts loop-closure panel specifically, apply proper data-visualization craft (axis buffers, tooltip design, clear status coloring) the same way — chart quality is core UX here, not decoration, since the whole product's pitch rests on care-gap visibility being instantly legible.

### 3.7 Stress-testing a decision before locking it in → `grilling`

Before finalizing a plan for anything architecturally significant (e.g., "should care-gap detection run as a derived query or a materialized flag," "is the linear-chain backlog actually the right call for a 4-person team") — grill the decision rather than assuming the first answer is right. Cheaper to find the hole in an idea during planning than after three downstream issues depend on it.

### 3.8 Reviewing before merge → `code-review`

See §4 below — this is the mandatory gate before any issue moves to `done/`.

---

## 4. Review gate — before moving an issue to `done/`

Every issue passes through the same two-axis check before it's allowed into `done/`, run via the `code-review` skill:

- **Standards** — does the code follow this project's conventions (TypeScript strictness, the monorepo layout from PRD §12, the unified `actionStatus` state machine from PRD §10.1)?
- **Spec** — does the implementation actually satisfy every acceptance criterion listed in the issue file, and does it match the PRD section(s) it references? An action that reaches `CLOSED` without having been both completed and reviewed, or a dashboard section that silently hides an overdue action (violating PRD §8.2's loop-closure rule), fails this axis even if the code looks clean.

Both axes must pass. If the plan diverged from what was actually built (normal — plans are a starting point, not a contract), update the plan file to match reality _before_ moving it to `done/`, so the build log stays accurate.

---

## 5. How four people work a single-threaded backlog

The backlog in `issues/` is intentionally a strict chain — one blocker each — because a 4-hour build can't afford the coordination cost of a tangled dependency graph. But that doesn't mean three of four people sit idle while one implements. In practice:

- **Whoever is implementing the current issue owns it end to end** — its backend/logic half and its frontend/UI half both live in the same issue precisely so one person (or a tight pair) can hold the whole slice in their head, rather than needing a handoff mid-issue.
- **Everyone else works ahead on plans**, not code. The moment an issue's blocker looks likely to land soon, someone can start drafting `plans/ISSUE-00(X+1)-plan.md` against the _current_ shape of the blocker's interface — re-verify that interface once the blocker actually lands in `done/`, since it may have shifted during implementation.
- **Cross-cutting prep work** (validating the seed reference scenario for ISSUE-011, drafting the care-gap alert copy for ISSUE-007, rehearsing the demo script) doesn't block on the chain at all and can happen in parallel from hour zero — see PRD §16's team plan and `issues/README.md`.

The chain governs _implementation start order_, not _thinking order_. Plan ahead; implement in order.

---

## 6. Project conventions quick-reference

- **Stack**: React + Vite + TanStack Router + Tailwind v4 + shadcn/ui, Hono + tRPC, Drizzle + Neon Postgres, Recharts, Biome (PRD §12.1). "BE" in every issue means `packages/db` + `packages/api` + `apps/server` — Naadi Loop does have a server, unlike a client-only MVP.
- **Data**: PostgreSQL on Neon via Drizzle, one branch per dev during the build; no static JSON, no mocked data on the demo's critical path (PRD §12.4).
- **Types**: every cross-component data shape is defined once via the Drizzle schema (`packages/db`) and the `zod` schemas + inferred `AppRouter` type (`packages/api`, frozen in ISSUE-001) — never duplicated ad hoc in a component file.
- **Git**: one issue's implementation = one focused set of commits; commit messages should reference the issue number (`ISSUE-004: wire saveCarePlan + activateCarePlan procedures`). Never bypass the review gate in §4 by moving an issue straight to `done/`.
- **Deployment**: web on Vercel/Netlify, server on Render/Railway/Fly, DB on Neon — see ISSUE-011.
