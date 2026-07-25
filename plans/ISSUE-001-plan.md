# Plan — ISSUE-001: Project Scaffold, Stack Wiring & Data Contracts

## 1. Goal

Naadi Loop's 4-hour build only works if four people can build in parallel without colliding. That's only possible if the tRPC contract and Drizzle schema are frozen *before* anyone starts writing screen or procedure logic, so the frontend can code against real types while the backend is still being implemented. This plan produces that frozen contract and the monorepo it lives in — nothing else. No procedure gets real logic here; the job is to make the seams correct so nobody has to redo them later.

## 2. Interface first

These are the exact seams every later issue builds against. Nail these down before touching any implementation detail below — a signature change after this issue ships is a domain-model change (update `CONTEXT.md` / add an ADR), not a quiet edit.

### `packages/db` — the only owner of the Neon client

```ts
// packages/db/src/schema.ts — exports (verbatim from PRD §9)
export const documentType:     PgEnum<["discharge_summary", "prescription", "referral", "lab_form", "other"]>;
export const actionType:       PgEnum<["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"]>;
export const priority:         PgEnum<["NORMAL", "URGENT"]>;
export const actionStatus:     PgEnum<["PENDING", "DUE", "COMPLETED", "AWAITING_REVIEW", "REVIEWED", "CLOSED"]>;
export const carePlanStatus:   PgEnum<["draft", "verified", "active", "closed"]>;
export const reportStatus:     PgEnum<["AWAITING_REVIEW", "REVIEWED"]>;
export const eventType:        PgEnum<["created", "verified", "activated", "completed", "skipped", "help_requested", "review_started", "reviewed", "closed", "follow_up_created"]>;
export const patient:          PgTable;
export const sourceDocument:   PgTable;
export const carePlan:         PgTable;
export const careAction:       PgTable; // type-discriminated JSONB payload, unified actionStatus
export const report:           PgTable;
export const actionEvent:      PgTable; // append-only audit trail; also powers loop-closure metrics

// packages/db/src/client.ts — the ONLY file allowed to import @neondatabase/serverless
export function getDb(): NeonHttpDatabase;
```

Nothing outside `packages/db` imports `@neondatabase/serverless` or a raw connection string directly — `packages/api` and `apps/server` only ever call `getDb()`.

### `packages/api` — the only seam `apps/web` depends on for data

```ts
// packages/api/src/trpc.ts
export const publicProcedure: ProcedureBuilder;
export const protectedProcedure: ProcedureBuilder; // requires an authenticated user in ctx

// packages/api/src/context.ts
export function createContext(opts: FetchCreateContextFnOptions): { db: NeonHttpDatabase; user: AuthedUser | null };

// packages/api/src/schemas.ts
export const careActionSchema:     ZodType; // discriminated union on `type`, per PRD §8/§9
export const documentInputSchema:  ZodType; // { type: documentType, content: string }
export const completeActionSchema: ZodType; // { actionId, outcome: 'taken' | 'skipped' | 'help', notes? }
export const reviewReportSchema:   ZodType; // { reportId, comment, followUp?: { ...careActionSchema } }

// packages/api/src/router.ts — signatures per PRD §7
export const appRouter: ReturnType<typeof router>;
export type AppRouter = typeof appRouter;
```

Every procedure body in this issue is a one-liner: `throw new TRPCError({ code: "NOT_IMPLEMENTED" })`. Real logic is ISSUE-002+.

### `apps/server` — pure wiring, no logic

```ts
// apps/server/src/index.ts
const app: Hono; // mounts appRouter via the tRPC fetch adapter at /trpc, nothing else
```

Deletion test: swap this file for a different runtime adapter (e.g. an edge function) and zero procedure logic should have to move.

### `apps/web` — the tRPC client

```ts
// apps/web/src/lib/trpc.ts
export const trpc: TRPCReactClient<AppRouter>; // imported from @naadi/api, not redeclared
```

## 3. File-by-file steps

Work in this order — it mirrors the workspace-dependency chain (`db` → `api` → `server`/`web`) from the issue's install commands, so nothing is built against a package that doesn't exist yet.

### 3.1 Workspace root
1. `package.json` — private root, `"workspaces"`-equivalent via `pnpm-workspace.yaml`.
2. `pnpm-workspace.yaml` — `packages: ["apps/*", "packages/*"]`.
3. `biome.json` — via `npx @biomejs/biome init`; keep defaults, just wire lint+format scripts.
4. `.env.example` at root (or per-app) — documents `DATABASE_URL`, not committed with real values.
5. Run install commands §1 from `issues/ISSUE-001.md`.

### 3.2 `packages/db`
1. `package.json` — name `@naadi/db`.
2. `src/schema.ts` — the full schema block from PRD §9, byte-for-byte (six entities, seven enums). `CareAction.payload` is `jsonb` shaped by the `type` discriminator — keep the column untyped at the Drizzle level and let `packages/api`'s zod schemas own the per-type shape.
3. `src/client.ts` — `getDb()` wrapping `drizzle(neon(process.env.DATABASE_URL))`.
4. `src/seed.ts` — produces the PRD §11 reference scenario:
   - one `Patient` (PHC patient, e.g. Rajan, age 55, phone, language, caregiver contact);
   - one PHC `providerId`-bearing user (e.g. Dr. Anjali);
   - one `SourceDocument` (chest-discomfort discharge summary, text content matching what the AI will be prompted against);
   - one `CarePlan` (`status: 'verified'`, `verifiedAt` set);
   - four `CareAction` rows — one per `actionType` (MEDICATION twice daily, TEST CBC, REFERRAL cardiology, FOLLOW_UP 7 days), with `reviewRequired: true` on TEST and REFERRAL;
   - one `CareAction` whose `dueDate` is in the past so the dashboard's Overdue section is non-empty on first load;
   - one `Report` against the TEST `CareAction` with `status: 'AWAITING_REVIEW'`;
   - a handful of `ActionEvent` rows so the patient journey is non-empty.
   - Due dates are computed at seed time relative to the current date, so the demo scenario doesn't rot on stage.
5. `drizzle.config.ts` — `dialect: "postgresql"`, `schema: "./src/schema.ts"`.
6. Run install commands §3 from the issue, then `drizzle-kit push` once the schema file exists.

### 3.3 `packages/api`
1. `package.json` — name `@naadi/api`, workspace dep on `@naadi/db`.
2. `src/trpc.ts` — `initTRPC` setup, `publicProcedure`/`protectedProcedure`.
3. `src/context.ts` — `createContext()` wiring `getDb()` + resolving the authed user via seeded `auth.login` (stubbed — real auth logic is a later issue).
4. `src/schemas.ts` — `careActionSchema` (discriminated on `type` per PRD §8's contract, with type-specific payload fields), `documentInputSchema`, `completeActionSchema`, `reviewReportSchema`.
5. `src/router.ts` — `appRouter` with every procedure listed in the issue's Data contracts section, each a `NOT_IMPLEMENTED` stub with the correct zod input.
6. Run install commands §4 from the issue.

### 3.4 `apps/server`
1. `package.json` — name `@naadi/server`, workspace deps on `@naadi/api` + `@naadi/db`.
2. `src/index.ts` — Hono app, `trpcServer` (or `fetchRequestHandler`) mounting `appRouter` at `/trpc`, `serve()` from `@hono/node-server`.
3. `src/env.ts` — reads/validates `DATABASE_URL` and any other env at startup, fails fast if missing.
4. Run install commands §5 from the issue.

### 3.5 `apps/web`
1. Scaffold via `pnpm create vite apps/web --template react-ts`, rename `package.json#name` to `@naadi/web`.
2. `src/app.css` — Tailwind v4 `@theme` block with a placeholder Naadi Loop palette (calm teal/blue primary; deferred to brand pass).
3. `src/lib/trpc.ts` — tRPC React client typed against `AppRouter` from `@naadi/api`.
4. `src/lib/query-client.ts` — `QueryClient` + `trpc.Provider` wiring, mounted in `src/main.tsx`.
5. `shadcn@latest init`, then add `button`, `card`, `dialog`, `form`, `input`, `badge`, `textarea`, `select`, `tabs` — lands in `src/components/ui/`.
6. Route stubs (one file each, placeholder content only) for every screen in PRD §12:
   - Provider: `routes/provider/patients.tsx` (selection), `routes/provider/patient.$id.document.tsx` (input), `routes/provider/patient.$id.verify.tsx` (verify care plan), `routes/provider/dashboard.tsx` (Requires attention / Awaiting review / Overdue / On track), `routes/provider/report.$id.tsx` (report review).
   - Patient: `routes/patient/next.tsx` (my next action), `routes/patient/journey.tsx` (care journey timeline), `routes/patient/action.$id.tsx` (action details), `routes/patient/action.$id.report.tsx` (report upload), `routes/patient/help.tsx` (help request).
7. `routes/index.tsx` — landing with the role toggle that calls `auth.login` against the seeded accounts and routes to the matching dashboard.
8. Router wiring (`src/router.ts` or `src/routeTree.ts`) registering all of the above.
9. Run install commands §2 from the issue.

### 3.6 Migrate + seed (last)
1. `pnpm --filter @naadi/db drizzle-kit push`
2. `pnpm --filter @naadi/db tsx src/seed.ts`

## 4. Test / verification approach

This issue is infrastructure, not logic or UI — verification is a manual pass against every Acceptance Criteria line in `issues/ISSUE-001.md`, in this order:

| Check | How |
|---|---|
| `pnpm install && pnpm dev` runs both apps, zero type errors | Run it; watch both dev servers boot; `tsc --noEmit` clean in each workspace |
| `drizzle-kit push` succeeds, schema matches §9 | Run against the dev's own Neon branch; inspect the resulting tables in the Neon console |
| Seed creates the right demo data | Query `patient` / `carePlan` / `careAction` after running `seed.ts`; confirm one row per scenario element, the four `actionType` values are all represented, the overdue referral is overdue, and the AWAITING_REVIEW report is present |
| `appRouter` exports every §7 procedure, correctly typed, `NOT_IMPLEMENTED` body | Call each procedure from a scratch script or the tRPC panel; confirm it throws the expected error, not a 404 or type error |
| `apps/web`'s tRPC client is fully typed | In an editor, deliberately pass a wrong input shape to a procedure call and confirm it's a red squiggle, not a runtime failure |
| All 10 routes are stubbed, with the role toggle | Browse to each route in the dev server; confirm a placeholder renders; flip the role toggle and confirm the landing re-routes |
| `pnpm biome check` clean | Run it |
| Every `package.json` matches the install-commands section | Diff each workspace's `dependencies`/`devDependencies` against `issues/ISSUE-001.md`'s Stack Setup section, in particular the `@naadi/db` workspace dep inside `packages/api` and `apps/server` |
| `CONTEXT.md` exists with the Naadi Loop glossary | Create/overwrite with the five terms from PRD §18 — Care action, Care plan, Loop closure, Care gap, Human gate |

No automated tests are written for this issue — there's no pure logic yet to TDD against (that starts at ISSUE-002).

## 5. Risks / open questions

- **Neon branch-per-dev coordination.** Each dev needs their own `DATABASE_URL` before the clock starts at 0:00 — resolve this outside the plan, not mid-build.
- **Zod schema churn.** If `careActionSchema` / `documentInputSchema` aren't nailed down here, M1 (patient experience) and M4 (AI & integration) will stub screens against guessed shapes and have to redo work once the real ones land. Treat them as equally frozen as the router signatures.
- **Intentionally logic-free.** Every procedure is `NOT_IMPLEMENTED` by design — confirm with whoever picks up ISSUE-002 that this is the expected starting point, not a gap.
- **Auth stub shape.** `createContext()` needs to resolve "the current user" somehow even though real auth (`auth.login`) is `NOT_IMPLEMENTED`. The role toggle in the UI will call `auth.login` with a seed email; the procedure body is still `NOT_IMPLEMENTED` in this issue, but the signature and zod input are frozen so the UI can be wired against it without churn.
- **Tailwind palette.** Not in the PRD. Pick a calm teal/blue placeholder in `app.css` and flag for a brand pass in a later issue.
- **ADR 0002 stale.** The current `docs/adr/0002-single-encounters-table-jsonb-payload.md` documents a decision about `encounters`. Naadi Loop uses `CareAction` with a `type`-discriminated JSONB payload (the same shape as the original decision, applied to a different entity) and a unified `actionStatus` state machine. The cleanest move is either (a) amend ADR 0002 to say "the JSONB-payload + discriminator pattern applies to any kind-bearing entity" and rename it, or (b) leave it as-is and add a new ADR for the unified status machine. Either way, do it when the first ISSUE-002+ lands real logic, not as part of this issue.
- **Repository process files out of scope.** `issues/README.md`, `plans/README.md`, and `done/README.md` currently reference a third product (TradeRoute). Out of scope for a single-issue refinement; flag for a separate housekeeping pass if it matters for the demo.
- **TanStack Router wiring style not fully specified.** The issue installs `@tanstack/react-router` but not a file-based-routing codegen plugin (`@tanstack/router-plugin`). This plan assumes **code-based route registration** (routes defined and composed by hand in `src/router.ts`), not generated file-based routing. If file-based routing is actually wanted, add `@tanstack/router-plugin` to the `apps/web` install step before starting §3.5 — flag this to the team before 0:30 rather than discovering it mid-build.
