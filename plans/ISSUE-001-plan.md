# Plan — ISSUE-001: Project Scaffold, Stack Wiring & Data Contracts

## 1. Goal

Naadi's 4-hour build only works if four people can build in parallel without colliding. That's only possible if the tRPC contract and Drizzle schema are frozen *before* anyone starts writing screen or procedure logic, so the frontend can code against real types while the backend is still being implemented. This plan produces that frozen contract and the monorepo it lives in — nothing else. No procedure gets real logic here; the job is to make the seams correct so nobody has to redo them later.

## 2. Interface first

These are the exact seams every later issue builds against. Nail these down before touching any implementation detail below — a signature change after this issue ships is a domain-model change (update `CONTEXT.md` / add an ADR), not a quiet edit.

### `packages/db` — the only owner of the Neon client

```ts
// packages/db/src/schema.ts — exports (verbatim from PRD §8)
export const roleEnum: PgEnum<["patient", "provider"]>;
export const providerType: PgEnum<["hospital", "clinic", "lab", "pharmacy"]>;
export const encounterKind: PgEnum<["visit", "diagnosis", "prescription", "lab_result", "immunization", "procedure"]>;
export const consentStatus: PgEnum<["pending", "approved", "revoked", "expired"]>;
export const users: PgTable;
export const patients: PgTable;
export const providers: PgTable;
export const encounters: PgTable;
export const consents: PgTable;
export const auditLog: PgTable;

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
export const emergencySchema: ZodType;          // blood group, allergies[], chronicConditions[], emergencyContact
export const encounterSchema: ZodType;           // discriminated union on `kind`, per PRD §8/§9

// packages/api/src/router.ts — signatures verbatim from PRD §9
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
2. `src/schema.ts` — the full schema block from PRD §8, byte-for-byte.
3. `src/client.ts` — `getDb()` wrapping `drizzle(neon(process.env.DATABASE_URL))`.
4. `src/seed.ts` — creates Priya (`healthId: "NAADI-7Q4K2M"`) + a second seeded patient + Dr. Sharma / City Clinic provider, matching PRD §16's demo script.
5. `drizzle.config.ts` — `dialect: "postgresql"`, `schema: "./src/schema.ts"`.
6. Run install commands §3 from the issue, then `drizzle-kit push` once the schema file exists.

### 3.3 `packages/api`
1. `package.json` — name `@naadi/api`, workspace dep on `@naadi/db`.
2. `src/trpc.ts` — `initTRPC` setup, `publicProcedure`/`protectedProcedure`.
3. `src/context.ts` — `createContext()` wiring `getDb()` + resolving the authed user (stubbed — real auth logic is a later issue).
4. `src/schemas.ts` — `emergencySchema`, `encounterSchema` (discriminated on `kind`), consent/scope schemas as needed by router inputs.
5. `src/router.ts` — `appRouter` with every procedure from PRD §9, each a `NOT_IMPLEMENTED` stub with the correct zod input.
6. Run install commands §4 from the issue.

### 3.4 `apps/server`
1. `package.json` — name `@naadi/server`, workspace deps on `@naadi/api` + `@naadi/db`.
2. `src/index.ts` — Hono app, `trpcServer` (or `fetchRequestHandler`) mounting `appRouter` at `/trpc`, `serve()` from `@hono/node-server`.
3. `src/env.ts` — reads/validates `DATABASE_URL` and any other env at startup, fails fast if missing.
4. Run install commands §5 from the issue.

### 3.5 `apps/web`
1. Scaffold via `pnpm create vite apps/web --template react-ts`, rename `package.json#name` to `@naadi/web`.
2. `src/app.css` — Tailwind v4 `@theme` block, tokens verbatim from PRD §11.3.
3. `src/lib/trpc.ts` — tRPC React client typed against `AppRouter` from `@naadi/api`.
4. `src/lib/query-client.ts` — `QueryClient` + `trpc.Provider` wiring, mounted in `src/main.tsx`.
5. `shadcn@latest init`, then add `button`, `card`, `dialog`, `form`, `input`, `badge` — lands in `src/components/ui/`.
6. Route stubs (one file each, placeholder content only) for every screen in PRD §6: `routes/login.tsx`, `routes/onboarding.tsx`, `routes/provider/search.tsx`, `routes/consent.tsx`, `routes/provider/add-encounter.tsx`, `routes/timeline.tsx`, `routes/emergency.tsx` (public, no auth guard), `routes/audit-log.tsx`, `routes/analytics.tsx`.
7. `routes/design-tokens.tsx` — debug route rendering a swatch per color token from PRD §11.3, for the acceptance-criteria check.
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
| Directory structure matches PRD §10.2 | Diff the tree by eye against §10.2 |
| `drizzle-kit push` succeeds, schema matches §8 | Run against the dev's own Neon branch; inspect the resulting tables in the Neon console |
| Seed creates the right demo data | Query `patients` for `healthId = 'NAADI-7Q4K2M'` and `providers` for City Clinic after running `seed.ts` |
| `appRouter` exports every §9 procedure, correctly typed, `NOT_IMPLEMENTED` body | Call each procedure from a scratch script or the tRPC panel; confirm it throws the expected error, not a 404 or type error |
| `apps/web`'s tRPC client is fully typed | In an editor, deliberately pass a wrong input shape to a procedure call and confirm it's a red squiggle, not a runtime failure |
| `/design-tokens` renders all 9 tokens at correct hex | Visual check in browser against the PRD §11.3 table |
| `pnpm biome check` clean | Run it |
| Every `package.json` matches the install-commands section | Diff each workspace's `dependencies`/`devDependencies` against `issues/ISSUE-001.md`'s Stack Setup section, in particular the `@naadi/db` workspace dep inside `packages/api` and `apps/server` |
| `CONTEXT.md` + both ADRs exist | Already created this session — confirm no accidental deletion |

No automated tests are written for this issue — there's no pure logic yet to TDD against (that starts at ISSUE-002, per the `tdd` skill guidance in `workflow.md` §3.1).

## 5. Risks / open questions

- **Neon branch-per-dev coordination.** Each dev needs their own `DATABASE_URL` before the clock starts at 0:00 — resolve this outside the plan, not mid-build.
- **Zod schema churn.** If `emergencySchema`/`encounterSchema` aren't nailed down here, D3 and D4 will stub screens against guessed shapes and have to redo work once the real ones land. Treat them as equally frozen as the router signatures.
- **Intentionally logic-free.** Every procedure is `NOT_IMPLEMENTED` by design — confirm with whoever picks up ISSUE-002 that this is the expected starting point, not a gap.
- **TanStack Router wiring style not fully specified.** The issue installs `@tanstack/react-router` but not a file-based-routing codegen plugin (`@tanstack/router-plugin`). This plan assumes **code-based route registration** (routes defined and composed by hand in `src/router.ts`), not generated file-based routing. If file-based routing is actually wanted, add `@tanstack/router-plugin` to the `apps/web` install step before starting §3.5 — flag this to the team before 0:30 rather than discovering it mid-build.
- **Auth stub shape.** `createContext()` needs to resolve "the current user" somehow even though real auth (`auth.login`) is `NOT_IMPLEMENTED`. This plan stubs it as always-`null`/unauthenticated for `protectedProcedure` to reject correctly by default; confirm this doesn't block D2's auth-context work in the 0:30–2:00 parallel window.
