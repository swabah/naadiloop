# Plan — ISSUE-002: Codebase & Spec Audit

## 1. Goal

Audit the completed ISSUE-001 scaffold and every specification/process input for remnants of the earlier TradeRoute project or for Naadi contract drift. Fix small, unambiguous findings now so ISSUE-003 starts from a clean vocabulary, schema, visual-token, and backlog baseline.

## 2. Interface first

This audit adds no product API or database migration. It preserves the frozen tRPC procedure tree and SQL table names.

The only code-facing contract correction is to align Drizzle's exported table identifiers with PRD §10:

```ts
export const patients: PgTable;
export const sourceDocuments: PgTable;
export const carePlans: PgTable;
export const careActions: PgTable;
export const reports: PgTable;
export const actionEvents: PgTable;
```

All internal imports in `packages/db` and `packages/api` must consume these canonical plural exports. The underlying SQL names, columns, enums, and seeded records remain unchanged.

## 3. Implementation steps

1. Run the issue's contamination search across specifications, process documents, source code, package manifests, README files, and commit messages, excluding dependencies, generated build output, lockfiles, and the explicit historical incident records.
2. Validate every backlog/issue `PRD refs` citation against the numbered headings in root `PRD.md`; treat `naadi-loop-prd.md` as a source document, not the citation authority.
3. Remove the obsolete root TradeRoute specification PDF and update the stale backlog statuses for ISSUE-001 and ISSUE-002.
4. Replace stale ADR 0002 with a Naadi Loop decision record describing the single `careActions` table, `actionType` discriminator, and typed JSONB payload.
5. Rename the six Drizzle table exports to their PRD §10 plural names and update the client/seed imports without changing SQL schema.
6. Restrict the `gate` purple treatment in the shared placeholder component to the verification and report-review routes; non-gate screens use normal Naadi status colors.
7. Record exact findings and fixes in ISSUE-002, rerun the audit and project checks, then move the ticket and plan together to `done/`.

## 4. Verification

- Contamination grep has no matches outside ISSUE-002 and the intentional historical notes in completed ISSUE-001 records.
- All `PRD refs` values in active/completed issues and the backlog resolve to root `PRD.md` sections.
- Every workspace package uses the required `@naadi/*` name.
- Theme values for `primary`, `accent`, and `gate` equal PRD §13.3, and `gate` usage is limited to the two human-gate route states plus their component variants.
- The DB package exports six plural table identifiers and seven required enums; `pnpm typecheck` proves every consumer was updated.
- `pnpm check`, `pnpm typecheck`, and `pnpm build` pass.
- `git diff --check` passes and no obsolete TradeRoute-named file remains.

## 5. Risks

- Historical descriptions in ISSUE-001 and ISSUE-002 intentionally contain the word `TradeRoute`; the audit must distinguish those records from live product/configuration contamination.
- Renaming TypeScript exports is compile-time breaking even though SQL is unchanged, so the full monorepo type check is mandatory.
