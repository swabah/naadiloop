# TradeRoute — Project Workflow

This document is the operating manual for building TradeRoute. `PRD.md` says what we're building and why; the `issues/` backlog says in what order; this document says *how a piece of work actually moves from idea to shipped code*, including which of the available skills to reach for at each stage. Read this once before picking up the first issue.

---

## 1. The core loop

Every unit of work in this project — from a hackathon feature to a post-hackathon roadmap item — moves through the same four stages:

```
issues/ISSUE-00X.md   →   plans/ISSUE-00X-plan.md   →   implementation   →   done/ISSUE-00X.md + plan
     (what & why)              (how, in order)          (code + review)         (verified record)
```

1. **Pick the next unblocked issue.** Check `issues/README.md`'s dependency table — an issue is only actionable once the issue it's "Blocked by" is sitting in `done/`.
2. **Write the plan.** Create `plans/ISSUE-00X-plan.md` before touching implementation code. See `plans/README.md` for what a plan must contain (interface first, then file-by-file steps, then verification approach).
3. **Implement against the plan**, using the skill guidance in §3 below for the *kind* of work each part of the issue is.
4. **Review, then move to done.** Verify every acceptance criterion in the issue, run it through the review gate in §4, then `git mv` both the issue and its plan into `done/`.

Because the backlog is a strict linear chain (§2 of `issues/README.md`), at any moment there is exactly one issue that's actionable for implementation. That does **not** mean only one person can be productive — see §5 for how a 4-person team parallelizes against a single-threaded backlog.

---

## 2. How the PRD, the issues, and the code relate

- `PRD.md` is the **decision record** — it holds the *why* behind every requirement, and it doesn't change once an issue derived from it is in flight. If a plan seems to contradict the PRD, the PRD wins; open a discussion before overriding it.
- `issues/` is the **backlog** — one deliverable slice per file, each already scoped into backend/logic and frontend/UI halves, each pointing back at the specific PRD section it implements.
- `plans/` is **active work** — it should only ever contain plans for issues currently being built. An empty `plans/` directory is a healthy state, not a broken one.
- `done/` is the **build log** — a chronological, self-contained record that should let anyone reconstruct exactly what was built, in what order, and why, without touching git history.

If you find yourself needing to add a requirement that isn't in the PRD, add it to the PRD first (with its own "why," per the PRD's own conventions), *then* write the issue. Code should never trace back to a requirement that only exists in someone's head.

---

## 3. Which skill to reach for, and when

TradeRoute's build touches three different kinds of work — pure calculation logic, visual/UI design, and day-to-day debugging — and different available skills are suited to each. This section exists so nobody defaults to "just write the code" when a skill would produce a materially better result for that specific kind of work.

### 3.1 Pure logic and calculations → `tdd`
`calculateDrivingCost`, `calculateTradeoff`, and the Pareto-frontier filter (ISSUE-003, ISSUE-005) are exactly the kind of code TDD is built for: pure functions with known, PRD-specified expected outputs (PRD §7.1's worked example — ₹775 fuel + ₹520 toll + ₹300 parking + ₹245 depreciation = ₹1,840 — *is already a test case*, not just documentation). Write the failing test from the PRD's worked numbers first, then implement to green. This matters more than usual here because these are the numbers a judge might question live (PRD §18) — a red-green-refactor trail is the fastest way to prove a number is correct under pressure.

### 3.2 Something is broken or slow → `diagnosing-bugs`
When the slider recalculation blows past its 100ms budget (PRD §10.1), when a corridor renders `NaN`, or when an edge case from ISSUE-009 resists a clean fix — don't guess-and-patch. Use the diagnosis loop to isolate root cause before changing code. A quick patch that papers over a miscalculated cost is worse than a slow, correct one, given the product's entire premise is trustworthy numbers.

### 3.3 Unsure whether a design or state model feels right → `prototype`
Before committing a plan for something genuinely uncertain — does the Pareto-frontier line read clearly at 3 dots vs. 4? does the slider's log-scale tick spacing actually feel right? — build a disposable prototype to answer the question first, rather than baking the guess straight into a plan. This is cheaper than discovering the answer is wrong after ISSUE-007 is already in `done/`.

### 3.4 Keeping vocabulary and architecture consistent → `domain-modeling`
TradeRoute's data model has precise, load-bearing terminology: "door-to-door," "Journey Value," "Pareto-optimal," "recommended" vs. "cheapest" vs. "fastest" are *not* interchangeable (PRD §7.2 is explicit these three must stay visibly distinct). When a new issue or plan introduces a new term, or when it's unclear whether two things (e.g., "buffer time" vs. "first-mile duration") are actually the same concept, use domain-modeling thinking to pin it down and record the decision — don't let two components silently drift toward different definitions of the same word.

### 3.5 Designing a component's interface before building it → `codebase-design`
Every plan's "interface first" step (see `plans/README.md`) is where this applies: before writing `TradeoffChart.tsx`'s implementation, decide what data shape it consumes and what it exposes, the way a deep module should — simple to call, real logic hidden behind the interface. This is especially relevant at the `JourneyMode` / `TradeoffResult` seam (ISSUE-004/005), since nearly every later issue depends on that interface staying stable.

### 3.6 Visual design, layout, and component styling → `ui-ux-pro-max` skill family
For anything touching the actual pixels — card layout, the scatter plot's visual treatment, the slider's track/thumb styling, spacing, responsive behavior — use the `ui-ux-pro-max` and `ui-styling` skills rather than improvising. TradeRoute's brand tokens are already fixed by PRD §12 (navy/teal/mode-colors, Inter + tabular mono) — treat these skills as the craft layer that applies those fixed tokens well (contrast, spacing rhythm, component states), not as a place to introduce new colors or typefaces. For the scatter/bar chart specifically, apply proper data-visualization craft (axis buffers, tooltip design, an emphasized recommended point) the same way — chart quality is core UX here, not decoration, since the whole product's pitch rests on the cost-vs-time tradeoff being instantly legible.

### 3.7 Stress-testing a decision before locking it in → `grilling`
Before finalizing a plan for anything architecturally significant (e.g., "should the tradeoff engine live in a hook or a pure module," "is the linear-chain backlog actually the right call for a 4-person team") — grill the decision rather than assuming the first answer is right. Cheaper to find the hole in an idea during planning than after three downstream issues depend on it.

### 3.8 Reviewing before merge → `code-review`
See §4 below — this is the mandatory gate before any issue moves to `done/`.

---

## 4. Review gate — before moving an issue to `done/`

Every issue passes through the same two-axis check before it's allowed into `done/`, run via the `code-review` skill:

- **Standards** — does the code follow this project's conventions (TypeScript strictness, the file structure from PRD §11, the state-management pattern from ISSUE-004)?
- **Spec** — does the implementation actually satisfy every acceptance criterion listed in the issue file, and does it match the PRD section(s) it references? A card that renders but shows the wrong total, or a breakdown that silently pre-sums driving costs (violating PRD §7.1's hard requirement), fails this axis even if the code looks clean.

Both axes must pass. If the plan diverged from what was actually built (normal — plans are a starting point, not a contract), update the plan file to match reality *before* moving it to `done/`, so the build log stays accurate.

---

## 5. How four people work a single-threaded backlog

The backlog in `issues/` is intentionally a strict chain — one blocker each — because a 4-hour build can't afford the coordination cost of a tangled dependency graph. But that doesn't mean three of four people sit idle while one implements. In practice:

- **Whoever is implementing the current issue owns it end to end** — its backend/logic half and its frontend/UI half both live in the same issue precisely so one person (or a tight pair) can hold the whole slice in their head, rather than needing a handoff mid-issue.
- **Everyone else works ahead on plans**, not code. The moment an issue's blocker looks likely to land soon, someone can start drafting `plans/ISSUE-00(X+1)-plan.md` against the *current* shape of the blocker's interface — re-verify that interface once the blocker actually lands in `done/`, since it may have shifted during implementation.
- **Cross-cutting prep work** (validating corridor data sources for ISSUE-013, drafting the Assumptions modal copy for ISSUE-011, rehearsing the demo script) doesn't block on the chain at all and can happen in parallel from hour zero — see the hackathon build plan referenced in PRD Appendix B / `issues/README.md`.

The chain governs *implementation start order*, not *thinking order*. Plan ahead; implement in order.

---

## 6. Project conventions quick-reference

- **Stack**: React 18 + Vite + TypeScript, Tailwind + shadcn/ui, Recharts, Framer Motion, React Context + `useReducer` (PRD §11). No backend server for the MVP — "BE" in every issue means the logic/data layer, not a server.
- **Data**: static JSON per corridor (`public/data/corridors/*.json`), shared constants in `src/lib/constants.ts`. No live network calls on the demo's critical path (PRD §3.3).
- **Types**: every cross-component data shape is defined once in `src/lib/types.ts` (ISSUE-001) and never duplicated ad hoc in a component file.
- **Git**: one issue's implementation = one focused set of commits; commit messages should reference the issue number (`ISSUE-004: wire AppContext to SearchBar submit`). Never bypass the review gate in §4 by moving an issue straight to `done/`.
- **Deployment**: Vercel, zero-config from the Vite build (`pnpm build` → `dist/`) — see ISSUE-013.
