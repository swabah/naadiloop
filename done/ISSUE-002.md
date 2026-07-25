# ISSUE-002 — Codebase & Spec Audit: TradeRoute Contamination Check

**Blocked by:** 001 (Project Scaffold, Stack Wiring & Data Contracts)
**PRD refs:** — (process/integrity issue, not a PRD-derived feature; source of truth is `CONTEXT.md`'s glossary and `PRD.md` itself)
**Related:** the ISSUE-002–011 backlog-planning pass (commit `a518b2d`) that already found and fixed contamination in `workflow.md`, `issues/README.md`, and `plans/README.md`

## Why

Naadi Loop replaced an earlier hackathon project, TradeRoute, in this repo. That migration was incomplete: `workflow.md`, `issues/README.md`, and `plans/ISSUE-001-plan.md` carried TradeRoute-specific examples (Pareto-frontier filters, driving-cost calculators, corridor data), a "no backend server" assumption that's false for Naadi Loop, and PRD section-number references that pointed at the wrong document, until a housekeeping pass fixed them. **ISSUE-001 — the issue that actually scaffolds the codebase — was drafted during that same contaminated period**, and its acceptance criteria are still unchecked (implementation hasn't started; no `apps/` or `packages/` directory exists yet in this repo). Before any code gets generated from ISSUE-001's plan, and before any feature issue builds on top of it, this issue exists to (a) confirm the *inputs* to implementation — `PRD.md`, `CONTEXT.md`, the ADRs, `ISSUE-001.md`, and its plan — are actually clean, and (b) once ISSUE-001 is implemented, scan the *output* (the generated monorepo) for anything that slipped through: a copy-pasted component name, a stray brand color, a wrong package name, a comment that still says "TradeRoute." A leftover baked into a frozen contract (the tRPC router, the schema, the brand tokens) is expensive to unwind once ISSUE-003+ depend on it.

## Scope

This issue has two parts, gated by whether ISSUE-001's code exists yet. It doesn't split into Backend/Frontend halves like the rest of the backlog — it's a single audit task.

### Part A — Spec & process audit (can run now, before any code exists)

Re-verify every planning artifact ISSUE-001's plan was (or will be) written against:

- `PRD.md`, `naadi-loop-prd.md`, `CONTEXT.md`, `docs/adr/0001-*.md`, `docs/adr/0002-*.md`
- `issues/ISSUE-001.md`, `plans/ISSUE-001-plan.md`
- `workflow.md`, `issues/README.md`, `plans/README.md`, `done/README.md`
- Any `.qodo/agents` or `.qodo/workflows` config files, if populated

Search for `TradeRoute`, `Pareto`, `corridor`, `Journey Value`, `driving cost`, `slider`, `scatter plot`, `value-of-time`, and any other TradeRoute-domain term. Also check for PRD section-number drift: root `PRD.md` (21 sections) is canonical; `naadi-loop-prd.md` (18 sections, differently numbered) is a superseded source doc. Every "PRD refs" citation across `issues/` and `plans/` must resolve against the root `PRD.md`'s actual headings.

*Already checked as of this issue's filing (2026-07-25):* a repo-wide grep across `PRD.md`, `naadi-loop-prd.md`, `CONTEXT.md`, both ADRs, and `.qodo` (currently empty) returns zero matches. `issues/ISSUE-001.md` and `plans/ISSUE-001-plan.md` each contain exactly one match — both are the historical "flag for a housekeeping pass" note, not live contamination. Part A's remaining job is re-confirming this stays true any time either file is edited before implementation starts.

### Part B — Generated codebase audit (once ISSUE-001's scaffold lands)

Once `pnpm install && pnpm dev` actually runs (ISSUE-001's acceptance criteria all checked true), scan the real output for contamination that wouldn't show up in the planning docs:

- Package names in every `package.json` — must be `@naadi/web`, `@naadi/server`, `@naadi/api`, `@naadi/db` per ISSUE-001's Stack Setup section, not a leftover TradeRoute-era name.
- Component/file names accidentally copy-pasted from a TradeRoute-era template (e.g. anything resembling `TradeoffChart`, `ComparisonCard`, a slider component) that doesn't map to a real Naadi Loop screen from PRD §7.
- The Tailwind `@theme` block in `apps/web/src/app.css` — tokens must match PRD §13.3 exactly (`primary` `#0F766E`, `accent` `#F59E0B`, `gate` `#7C3AED` reserved for the two human-gate moments only), not a leftover navy/teal-mode-color scheme.
- `packages/db/src/schema.ts` — six entities and seven enums named exactly per PRD §10 (`patients`, `sourceDocuments`, `carePlans`, `careActions`, `reports`, `actionEvents`), not TradeRoute-era table names.
- Seed data content (`packages/db/src/seed.ts`) — the PHC chest-discomfort reference scenario from PRD §11, not placeholder journey/corridor data.
- Any committed `README.md` inside `apps/*` or `packages/*` left over from `pnpm create vite` / `shadcn init` defaults that wasn't overwritten.
- `git log` for ISSUE-001's implementation commits — messages should reference Naadi Loop / ISSUE-001, not carry over an unrelated commit-message habit.

## Acceptance Criteria

- [x] Part A: `grep -rliE "TradeRoute|Pareto|corridor|Journey Value|driving cost|slider|scatter plot|value-of-time"` across the whole repo returns zero matches outside files that explicitly and intentionally document this historical incident (this issue, `ISSUE-001.md`, the artifacts touched by commit `a518b2d`).
- [x] Part A: every "PRD refs" line in `issues/README.md` and any issue file resolves to a real `##` heading in root `PRD.md`.
- [x] Part B (once ISSUE-001 lands): the same grep run against the full generated codebase (`apps/`, `packages/`, lockfiles excluded) returns zero matches.
- [x] Part B: every `package.json#name` matches the `@naadi/*` convention.
- [x] Part B: `apps/web/src/app.css`'s `@theme` block matches PRD §13.3's token table exactly (hex values, not approximations).
- [x] Part B: `packages/db/src/schema.ts`'s six table names and seven enums match PRD §10 verbatim.
- [x] Any contamination found is either fixed directly in this issue (small — a stray string, a wrong hex) or spun out into its own follow-up issue (large — e.g. a schema rename) rather than silently left.
- [x] Findings are recorded in `done/ISSUE-002.md` — if nothing beyond what's already fixed is found, that's stated explicitly ("audited, clean") rather than the issue being skipped.

## Audit Findings — 2026-07-25

The live specifications and generated code are audited clean after the following direct fixes:

| Finding | Resolution |
|---|---|
| Obsolete `traderoute_complete_specification.pdf` remained at the repository root | Removed |
| ADR 0002 still described the earlier `encounters` model and cited the wrong PRD section | Replaced with the current `careActions` discriminator + typed JSONB decision |
| Backlog claimed ISSUE-001 was unimplemented and Part B remained blocked | Updated to the completed/current lifecycle state |
| Drizzle table exports were singular despite PRD §10's canonical plural identifiers | Renamed all six exports and their internal consumers; SQL names and data were unchanged |
| Generic route placeholders used the purple `gate` token decoratively | Limited purple treatment to provider verification and report-review routes |

Verification found:

- No prohibited domain term or filename remains outside the explicit historical incident records in ISSUE-001/ISSUE-002 and the backlog explanation.
- All 48 parsed `PRD refs` citations resolve against headings in root `PRD.md`.
- Workspace names are exactly `@naadi/web`, `@naadi/server`, `@naadi/api`, and `@naadi/db`.
- PRD §13.3 core tokens are exact: primary `#0F766E`, accent `#F59E0B`, gate `#7C3AED`.
- The DB contract exposes six canonical plural tables and seven enums; the reference seed remains the PHC chest-discomfort scenario.
- No scaffold README or TradeRoute-named commit exists in the ISSUE-001 implementation output.

## Risks / Open Questions

- Part B literally cannot run until ISSUE-001 is implemented. The linear chain (`workflow.md §2`) already blocks ISSUE-003 on this issue by construction, so Part A can close out now and Part B reopens the same ticket once ISSUE-001 lands — don't create a separate ISSUE-002b for that, amend this one.
- If Part A or Part B turns up something beyond a string fix — e.g. a load-bearing wrong assumption baked into the frozen `appRouter` contract or `packages/db` schema — treat that as a signal to reopen ISSUE-001's plan rather than patching around it downstream. Per `workflow.md §2`, a contract change now is cheap; a contract change after ISSUE-005+ depend on it is not.
