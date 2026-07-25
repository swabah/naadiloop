# ISSUE-001 — Project Scaffold, Stack Wiring & Data Contracts

**Blocked by:** — (foundational; unlocks every other issue)
**PRD refs:** §7 (Functional Requirements), §8 (AI Contract), §9 (Data Model & State Machine), §10 (Care-Gap Rules), §11 (Reference Scenario), §12 (Screens), §13 (NFRs), §15 (Milestones), §16 (Demo Acceptance Script)
**Domain model:** `CONTEXT.md` (Naadi Loop glossary), `docs/adr/0001-monorepo-trpc-contract-first.md`

## Why

Naadi Loop is a 4-hour hackathon MVP (PRD §15) whose single responsibility is to track a care journey from instruction → completion → review. Four people build in parallel against a strict milestone schedule, so the only way the demo survives the clock is to freeze the tRPC contract and Drizzle schema *before* anyone writes screen or procedure logic — the frontend must code against real types while the backend is still being implemented. This issue produces that frozen contract, the monorepo it lives in, and nothing else. No procedure gets real logic here (that's ISSUE-002+); this issue's job is to make the seams correct so nobody has to redo them later.

## Scope

### Backend / Logic scope

- pnpm workspace scaffold: `apps/web`, `apps/server`, `packages/api`, `packages/db`.
- `packages/db`: Drizzle schema exactly as specified in PRD §9 — six entities (`Patient`, `SourceDocument`, `CarePlan`, `CareAction`, `Report`, `ActionEvent`) and their enums (`documentType`, `actionType`, `priority`, `actionStatus`, `carePlanStatus`, `reportStatus`, `eventType`); a Neon client factory; and a `seed.ts` that produces the PRD §11 reference scenario: a PHC patient with recurring chest discomfort, a PHC provider, a pre-loaded discharge-summary `SourceDocument`, a verified `CarePlan` with the four action types (MEDICATION / TEST / REFERRAL / FOLLOW_UP), a seeded overdue referral so the dashboard is non-empty on first load, and a seeded `AWAITING_REVIEW` report.
- `packages/api`: `appRouter` with every procedure signature needed by PRD §7 stubbed (each throws `TRPCError({ code: "NOT_IMPLEMENTED" })` — real logic is out of scope here), plus the `zod` input schemas (`careActionSchema` discriminated on `type` per PRD §8, `documentInputSchema`, `completeActionSchema`, `reviewReportSchema`, etc.).
- `apps/server`: Hono app + tRPC fetch adapter wiring `appRouter`, env loading, Neon connection. No business logic lives here.
- Neon Postgres provisioned; one branch per dev.
- Biome config at the repo root.

### Frontend / UI scope

- `apps/web`: Vite + React scaffold, TanStack Router with a stub route per screen in PRD §12 — five provider (patient selection, document input, verify care plan, dashboard, report review) and five patient (my next action, my care journey, action details, report upload, help request) — each rendering a placeholder, not real content.
- Tailwind v4 `@theme` block in `app.css` with a placeholder Naadi Loop palette (calm teal/blue primary; the PRD does not specify one — flagged for a brand pass in a later issue).
- `shadcn/ui` initialized; base primitives installed (button, card, dialog, form, input, badge, textarea, select, tabs).
- `apps/web/src/lib/trpc.ts`: tRPC client typed against `packages/api`'s exported `AppRouter`.
- A role toggle in the header (PRD §13 — "patient and provider views must be switchable within one demo session") so the demo can switch between seeded accounts without a real auth flow.

## Stack Setup & Install Commands

Ordered, copy-pasteable installs for every dependency named in the Scope section above — this issue is meant to be executable from this section alone, not just descriptive. Run from the repo root unless a step says otherwise. Package names follow the `@naadi/web`, `@naadi/server`, `@naadi/api`, `@naadi/db` convention — set each `package.json#name` accordingly during scaffold, since every `--filter` command below depends on it. Order matters: `db` before `api` before `server`/`web`, because `api` and `server` take a workspace dependency on `db`.

```bash
# 1. Workspace root — satisfies the "pnpm workspace scaffold" bullet
pnpm init
mkdir -p apps/web apps/server packages/api packages/db
# pnpm-workspace.yaml → packages: ["apps/*", "packages/*"]
pnpm add -D @biomejs/biome && npx @biomejs/biome init

# 2. apps/web — Vite + React + TanStack Router + Tailwind v4 + shadcn + tRPC client
pnpm create vite apps/web --template react-ts
pnpm --filter @naadi/web add @tanstack/react-router @trpc/client @trpc/react-query \
  @tanstack/react-query
pnpm --filter @naadi/web add -D tailwindcss @tailwindcss/vite   # Tailwind v4
# add `@import "tailwindcss";` + the @theme block to apps/web/src/app.css
cd apps/web && npx shadcn@latest init && cd ../..

# 3. packages/db — Drizzle schema + Neon client + seed
pnpm --filter @naadi/db add drizzle-orm @neondatabase/serverless
pnpm --filter @naadi/db add -D drizzle-kit tsx
# drizzle.config.ts → dialect: "postgresql", schema: "./src/schema.ts"

# 4. packages/api — tRPC router; depends on @naadi/db for schema types
pnpm --filter @naadi/api add @trpc/server zod
pnpm --filter @naadi/api add @naadi/db@workspace:*

# 5. apps/server — Hono + tRPC fetch adapter; depends on @naadi/api for appRouter
pnpm --filter @naadi/server add hono @hono/node-server @trpc/server
pnpm --filter @naadi/server add @naadi/api@workspace:* @naadi/db@workspace:*

# 6. Migrate + seed — run last, once the §9 schema is written
pnpm --filter @naadi/db drizzle-kit push
pnpm --filter @naadi/db tsx src/seed.ts
```

## Interface-first design (codebase-design)

Naadi Loop has two real adapters for the DB — Neon's serverless HTTP driver today, a pooled connection if Naadi Loop ever runs outside a serverless host — so this is a genuine seam, not a hypothetical one. `packages/db`'s interface must not leak which adapter is behind it:

- **`packages/db` interface:** the exported Drizzle table objects (typed) + a single `getDb()` returning a Drizzle instance. Nothing outside `packages/db` imports `@neondatabase/serverless` directly.
- **`packages/api` interface:** one exported `appRouter` + its inferred `AppRouter` type. This is the *only* seam `apps/web` is allowed to depend on for data — no direct DB calls, no bespoke `fetch` calls from the frontend.
- **`apps/server` interface:** one Hono app instance mounting the tRPC adapter at a fixed path, nothing else. Deletion test: if `apps/server` were swapped for a different runtime adapter (e.g., an edge function), zero procedure logic should have to move — only wiring.
- Per ADR 0001, this contract-first shape is the reason the team can parallelize; the unified `actionStatus` state machine from PRD §9 and the single `CareAction` table carrying a `type`-discriminated JSONB payload are the parallel "shape it right once" decisions on the data side — get the schema and the enum right here so nobody "fixes" them mid-build by splitting `CareAction` into four tables under time pressure.

## Data contracts to freeze (verbatim from PRD)

**Schema** — see PRD §9 for the full `packages/db/src/schema.ts` listing (six entities, seven enums, the unified `actionStatus` model PENDING → DUE → COMPLETED → [AWAITING_REVIEW → REVIEWED] → CLOSED with `OVERDUE` as a derived flag, and the referral-stage mapping onto the same enum). The `CareAction.payload` JSONB shape per `type` is part of the contract even though it isn't enumerated in the PRD — keep the column, leave the per-type shape to the zod schemas in `packages/api`.

**Router signatures** — the full `packages/api/src/router.ts` listing covers these procedures (all stubbed with `NOT_IMPLEMENTED` in this issue):

- `auth.login` — seeded login or role-toggle resolution (returns `{user, role}`).
- `patient.list` / `patient.create` — FR-1 (provider selects/creates demo patient).
- `patient.nextAction` / `patient.journey` / `patient.actionDetails` — FR-6 / FR-7 / FR-8.
- `patient.markCompleted` / `patient.skipDose` / `patient.requestHelp` — FR-9 / FR-11.
- `patient.uploadReport` — FR-10.
- `document.create` / `document.extract` — FR-2 / FR-3 (the second is the AI call — stubbed; the strict-JSON contract lives in `packages/api/src/schemas.ts` per PRD §8).
- `carePlan.verify` / `carePlan.activate` — FR-4 / FR-5.
- `provider.dashboard` — FR-12 (returns the four sections: Requires attention / Awaiting review / Overdue / On track).
- `provider.reviewReport` / `provider.createFollowUp` — FR-13.
- `provider.listCareGaps` — FR-15 (deterministic rules from §10; can be derived in the procedure, not requiring a separate table).

**Both must land as specified in the PRD in this issue** — any deviation is a domain-model change and should update `CONTEXT.md` / get an ADR, not be made silently inside a later issue.

## Acceptance Criteria

- [ ] `pnpm install && pnpm dev` runs `apps/web` and `apps/server` concurrently with zero type errors.
- [ ] `pnpm --filter @naadi/db drizzle-kit push` succeeds against the dev's Neon branch; schema matches PRD §9 (six entities, seven enums, unified `actionStatus` model).
- [ ] `pnpm --filter @naadi/db tsx src/seed.ts` produces the PRD §11 reference scenario: PHC patient w/ recurring chest discomfort, PHC provider, one pre-loaded `SourceDocument`, one verified `CarePlan` carrying all four action types (MEDICATION / TEST / REFERRAL / FOLLOW_UP), one seeded overdue referral, one seeded `AWAITING_REVIEW` report.
- [ ] Seed computes due dates relative to the run date so the demo scenario doesn't rot on stage (per the spirit of PRD §13's NFR guidance — the original Naadi PRD spelled this out; flag if Naadi Loop needs it codified in `CONTEXT.md`).
- [ ] `appRouter` exports every procedure listed above, each with the correct `zod` input and a `NOT_IMPLEMENTED` stub body.
- [ ] `apps/web/src/lib/trpc.ts` imports the real `AppRouter` type from `packages/api` — calling a procedure with a wrong input shape is a type error in the editor, not a runtime surprise.
- [ ] All 10 PRD §12 routes are stubbed in `apps/web` (5 provider + 5 patient), each rendering a placeholder; a header-level role toggle resolves `auth.login` and routes to the matching dashboard.
- [ ] `pnpm biome check` passes clean.
- [ ] Every package's `package.json` dependencies match the Stack Setup & Install Commands section — including `packages/api` and `apps/server`'s workspace dependency on `@naadi/db`.
- [ ] `CONTEXT.md` exists at repo root with the Naadi Loop glossary (Care action, Care plan, Loop closure, Care gap, Human gate — per PRD §18).
- [ ] `docs/adr/0001-monorepo-trpc-contract-first.md` exists.

## Risks / Open Questions

- Neon branch-per-dev means each dev needs their own `DATABASE_URL` before 0:00 — coordinate this before the clock starts, not during.
- If zod input shapes aren't nailed down in this issue, M1 (patient experience), M2 (provider experience), and M4 (AI & integration) will stub screens against guessed shapes and churn once the real ones land — treat the zod schemas as equally frozen as the router signatures, not an afterthought.
- This issue intentionally ships zero real procedure logic (all `NOT_IMPLEMENTED`). Confirm with whoever picks up ISSUE-002 that "logic-free but type-correct" is an acceptable starting point rather than expecting working AI extraction, care-gap rules, or status transitions here.
- The PRD doesn't specify a Tailwind v4 palette; a placeholder lands in this issue. A real brand pass is a follow-up ticket.
- **Out of scope for this issue** (intentionally deferred — flag if any of these should land now):
  - Replacing or amending `docs/adr/0002-single-encounters-table-jsonb-payload.md` — that ADR documents a decision about `encounters`; Naadi Loop uses `CareAction` with a `type`-discriminated JSONB payload (the same shape as the original decision, applied to a different entity) and a unified `actionStatus` state machine. The cleanest move is either to amend ADR 0002 to say "the JSONB-payload + discriminator pattern applies to any kind-bearing entity" or to add a new ADR for the unified status machine; either way, do it when the first ISSUE-002+ lands real logic, not as part of this issue.
  - Updating the existing `issues/README.md`, `plans/README.md`, `done/README.md` — they currently reference a third product (TradeRoute) and are not the concern of a single-issue refinement.
  - Re-scoping `CONTEXT.md` to use the Naadi Loop glossary from PRD §18 (Care action, Care plan, Loop closure, Care gap, Human gate) — listed as an acceptance criterion here only because the issue text requires the file to exist; the actual content rewrite is a one-liner and can be bundled with this issue or the next.
