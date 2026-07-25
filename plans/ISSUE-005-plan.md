# Plan — ISSUE-005: Verify Care Plan & Activation (Human Gate #1)

## 1. Goal

Turn the verification placeholder into the demo's first non-negotiable human gate:
the Provider reviews AI-extracted Care actions against their source sentences, edits /
adds / deletes them, saves the verified set, and explicitly activates the Care plan —
and the Patient view remains empty until activation lands. The audit-trail invariant
(§8.3 of the PRD) holds: every state change in this slice writes its `ActionEvent`
in the same transaction as the state change itself.

## 2. Interface first

The frozen contract from ISSUE-001 already declares the two procedures that this
slice implements — no new top-level procedure is introduced, and the existing input
schemas are reused unchanged:

```ts
// packages/api/src/schemas.ts — already exported
verifyCarePlanSchema: { carePlanId: string; actions: CareAction[] }   // 1..50 actions
carePlanIdSchema:     { carePlanId: string }
```

The verify procedure's `create or update` wording from the issue is resolved in
favour of the simpler model: `document.extract` (ISSUE-004) atomically persists the
initial draft Care plan + draft Care actions and returns the new `carePlanId`; this
issue's `carePlan.verify` only updates an existing plan (and its actions) for the
given `carePlanId`. Activation is its own procedure and owns the patient-visibility
flip.

### `packages/api` — what this issue implements

```ts
// packages/api/src/router.ts
carePlan: router({
  // Updates an existing draft plan's action set.
  // - sourceText on every action MUST appear as a contiguous span in the
  //   plan's source document content (PRD §9.2 traceability).
  // - All non-deleted actions are written with `verified = true` and a
  //   `verified` ActionEvent row is written in the same transaction.
  verify:  protectedProcedure.input(verifyCarePlanSchema).mutation(...),

  // Activates a verified plan:
  // - rejects if any surviving action is `verified = false`;
  // - rejects if the caller is not the seeded provider on the plan;
  // - flips the plan to `active` and writes an `activated` ActionEvent per
  //   surviving action in the same transaction.
  activate: protectedProcedure.input(carePlanIdSchema).mutation(...),
}),
```

### `packages/api` — what this issue consumes

The verify procedure needs to read the plan's source document content for the
`sourceText`-in-source check. ISSUE-004's `document.extract` is the producer and
its contract (decided with the user) returns `{ documentId, carePlanId, actions }`,
so this issue assumes a draft plan row + a non-null `sourceDocumentId` already
exists by the time the Provider opens the verify page.

### `apps/web` — new route shape

The verify route gains a `carePlanId` path segment so it deep-links to a specific
draft and matches the `actions/$actionId` pattern used elsewhere:

```ts
// /provider/patients/$patientId/verify/$carePlanId
```

The current `/provider/patients/$patientId/verify` route is removed. ISSUE-004's
document route navigates to the new path on successful extraction.

## 3. Implementation steps

### 3.1 `packages/api` — shared source-traceability helper

1. Add `packages/api/src/care-plan/verify.ts` with a single pure helper:
   - `sourceTextAppearsIn(sourceText, sourceContent): boolean`
     - `sourceText.trim()` must be a non-empty string that appears as a
       contiguous span (case-insensitive, whitespace-collapsed) inside
       `sourceContent`. Returns `false` on empty source text.
   - The helper is exported so the `document.extract` procedure (ISSUE-004)
     can also call it without duplicating logic.

### 3.2 `packages/api` — `carePlan.verify` mutation

1. Open a Drizzle transaction (`ctx.db.transaction`) covering:
   - load the care plan row (with `sourceDocumentId`), reject `NOT_FOUND` if missing;
   - load the source document's `content`, reject if missing (data-integrity failure);
   - validate every input action via the existing `careActionSchema`
     (already enforced at the procedure boundary);
   - for each action, call `sourceTextAppearsIn`; if any action fails, throw
     `TRPCError({ code: "BAD_REQUEST", message: "Every action's sourceText must appear in the source document." })` and roll back;
   - delete all existing `care_actions` rows for the plan, then insert the new set
     with `verified: true` and a stable set of new UUIDs;
   - for every newly inserted action, insert a matching `action_events` row with
     `eventType: "verified"`, `createdBy: "provider"`, and `notes: "Verified by the Provider before activation."`;
   - update the plan row: `status` stays `draft` (verification is not activation), set `verifiedAt` to `now()`;
   - return the inserted plan with its verified actions in the same shape the
     frontend already consumes (the verify page refreshes the patient queries
     from this).
2. Reject when the caller is the seeded patient role (provider-only mutation).
   The current `protectedProcedure` allows both roles; add an inline role check
   or a `providerProcedure` (already exported from `trpc.ts`) and switch the
   procedure to it. `providerProcedure` is the right choice because the
   frozen signature uses `protectedProcedure` — verify the contract impact in
   step 3.5 and switch the procedure shape only if no other consumer depends
   on patient-role access.
3. Reject if the plan is no longer in `draft` status (a verified or active
   plan cannot be re-verified in this slice).

### 3.3 `packages/api` — `carePlan.activate` mutation

1. Open a Drizzle transaction covering:
   - load the care plan, reject `NOT_FOUND` if missing;
   - reject `FORBIDDEN` if `ctx.user.id !== plan.providerId` — the seeded
     Provider is the only legitimate activator per PRD §8.2 row 1;
   - reject `BAD_REQUEST` if `plan.status !== "draft"` (already active, or
     never verified) with a message the UI can surface;
   - load all `care_actions` for the plan, reject `BAD_REQUEST` if any row
     has `verified: false` with the count and offending ids in the message;
   - update the plan row: `status: "active"`, leave `verifiedAt` as the
     verification timestamp;
   - for every action, insert a matching `action_events` row with
     `eventType: "activated"`, `createdBy: "provider"`, `notes: "Care plan activated by the Provider."`;
   - return the activated plan with its actions.
2. This procedure is provider-only for the same reason as verify; the inline
   role check (or `providerProcedure` switch) covers it.

### 3.4 `packages/db` — no schema change

The existing schema (issue 001) already supports this slice:
- `care_plans.status: carePlanStatus` is `["draft", "verified", "active", "closed"]`;
  "active" is the canonical stored value (the issue's open question) and the UI
  copy uses "activated".
- `care_actions.verified: boolean`, `care_actions.sourceText: text`,
  `care_actions.carePlanId: uuid` are present.
- `action_events.eventType` already includes `"verified"` and `"activated"`.

No migration, no Drizzle schema edit. `pnpm db:push` is not required.

### 3.5 `packages/api` — input schema re-confirmation

The frozen `verifyCarePlanSchema` accepts `{ carePlanId, actions[] }` with
`actions: 1..50`. The `actions` field carries no `id` (new vs. updated actions
are indistinguishable in the input), which matches the design choice that
"verify" replaces the plan's full action set in one call — add/edit/delete are
expressed by the absence or modification of an action in the input array, not
by id. Document this explicitly in the procedure's TSDoc comment so ISSUE-006
+ ISSUE-007 don't re-derive it.

### 3.6 `apps/web` — route + navigation

1. `src/router.tsx`:
   - remove the existing `/provider/patients/$patientId/verify` route;
   - add `/provider/patients/$patientId/verify/$carePlanId` pointing to
     `ProviderVerifyPage`;
   - keep `nextTo` on the placeholder for the gate-illustration card.
2. `src/routes/provider/verify.tsx` (full rewrite):
   - receives the typed `patientId` and `carePlanId` from the router;
   - loads the draft plan via a new `trpc.carePlan.getDraft.useQuery` (added
     below in 3.8) for the editable-card view; falls back to a retryable
     empty-state on load failure;
   - manages a local editable list of `CareAction` cards (add / edit / delete)
     in component state, initialised from the loaded plan;
   - renders the source-document content in a read-only panel so the Provider
     can verify each `sourceText` against the source;
   - shows each action's source sentence inline (PRD §6.2 US-4 acceptance:
     "each action card displays the linked source span");
   - the "Save verification" button calls `carePlan.verify.mutate(...)` with
     the current edit set; on success, refetches `getDraft` and re-enables
     editing; on failure, surfaces a plain-language error and keeps the
     edits intact;
   - the "Activate care journey" button (gate-coloured, `variant="gate"`)
     is **only enabled** when every surviving action's local `verified`
     flag is true and the latest `carePlan.verify` has succeeded; the click
     calls `carePlan.activate.mutate(...)` and on success navigates to
     `/provider/dashboard`;
   - reserves the `gate` colour for the activate button, the badge, and the
     page header (no decorative `gate` use elsewhere — the brand rule).

### 3.7 `apps/web` — add / edit / delete controls

1. Each card exposes: type select, title, instructions (textarea), due date
   (`<input type="date">` mapped to `z.string().datetime({ offset: true })`),
   priority select, assigned-to text input, review-required toggle, and a
   read-only `sourceText` block quoted from the source.
2. Add appends a new draft action with a temporary client-side id and
   `verified: false`; the next `carePlan.verify` call assigns the real DB id.
3. Edit mutates the in-memory action; no DB write until "Save verification".
4. Delete removes from the in-memory list with a small confirm step; the
   page refuses to save an empty set (matches the schema's `.min(1)`).
5. Client-side validation mirrors the Zod schema for early feedback (the
   schema check on the server is still authoritative).

### 3.8 `packages/api` — small read helper for the verify page

Add a `carePlan.getDraft` query so the page can render the current draft set
without forcing the Provider to remember what was extracted. This is a
read-only helper and stays in `carePlan.*`:

```ts
// New, in this issue — not frozen by ISSUE-001
carePlan: router({
  ...
  getDraft: protectedProcedure
    .input(z.object({ carePlanId: z.string().uuid() }))
    .query(({ ctx, input }) => /* plan + actions + joined source document content */),
})
```

This is a **new** procedure; it is not in the ISSUE-001 contract and so it
adds, not changes, the router. If preferred, it can be folded into the
verify page's first paint via a single-purpose internal helper; the
contract-add cost is small and the read-after-navigate UX is much better.

### 3.9 `apps/web` — Patient-side probe for ISSUE-006

ISSUE-006 will own the Patient journey, but this issue must confirm the
acceptance criterion "After explicit activation, the Patient sees the journey
on the next poll." The smallest hand-off to ISSUE-006 is to leave a stub
that calls `carePlan.getDraft`-style helpers for the active plan only —
but the canonical Patient queries (`patient.journey`, `patient.nextAction`)
remain `NOT_IMPLEMENTED` and are explicitly out of scope here. Document
this boundary in the verify page's success toast so the demo presenter
knows to switch the role toggle.

### 3.10 Build, lint, type-check

1. `pnpm check`
2. `pnpm typecheck`
3. `pnpm build`

## 4. Verification

Every Acceptance Criterion in `issues/ISSUE-005.md` maps to a concrete check:

| AC | Check |
|---|---|
| Extracted actions arrive as editable draft cards. | After `document.extract` lands (ISSUE-004), the new route loads `getDraft` and renders the four cards. |
| The Provider can add, edit, and delete actions before activation. | UI smoke test: add a fifth action, edit the CBC test's due date, delete the referral — and the `carePlan.verify` payload reflects the change. |
| Each action visibly displays its source sentence. | Each card renders a `sourceText` block, and the source-document panel is visible alongside. |
| Saving verification marks the final action set verified and writes corresponding Action events. | After `carePlan.verify`, the `care_actions.verified` column is `true` for every surviving action and a matching `action_events` row with `eventType = "verified"` exists for each. |
| Activation is rejected if any action is unverified. | Manually toggle an action back to `verified: false` in the DB and call `carePlan.activate` — expect `BAD_REQUEST` with the offending ids. |
| Activation writes Action events in the same transaction as the plan state change. | A failed activation (e.g. by inducing a `source_document` delete mid-call) leaves no partial state — the plan stays `draft` and no `activated` events are written. |
| Draft or merely verified plans are absent from Patient queries. | Out of scope for the verify/activate page itself, but the contract is preserved by keeping `patient.journey` / `patient.nextAction` as `NOT_IMPLEMENTED` and noting the filter clause in the plan: `WHERE care_plans.status = 'active' AND care_actions.verified = true`. |
| After explicit activation, the Patient sees the journey on the next poll. | The `carePlan.activate` returns the plan with `status: "active"`, and the verify page's success toast points to the role-toggle + patient view. The actual poll is ISSUE-006. |
| The reference demo allows one due date to be corrected before activation. | The CBC test action's `dueDate` is editable; the edit is visible in the verify payload. |

Plus the standards checks the workflow calls for:
- `pnpm check` / `pnpm typecheck` / `pnpm build` pass.
- The `appRouter` is the only seam between UI and server; no new API client.
- `gate` colour is reserved for the activate button, the page header, and
  the badge — no decorative use.
- No new schema migration, no `NOT_IMPLEMENTED` regressions, no changes to
  ISSUE-001/002/003's verified contracts beyond the planned route change.

## 5. Risks / open questions

- **`active` vs. `activated` is resolved in code, not in prose.** The schema
  uses `active`; UI copy uses "activated". The procedure returns
  `status: "active"` and the page label says "Activated just now" — pick
  one in the runtime and never in the schema. (Per the issue's open
  question.)
- **First-load race.** The verify page may render before `getDraft` resolves.
  The placeholder card stays in place until the first successful query,
  matching the existing Patients list's loading pattern.
- **Provider-role guard.** Switching `carePlan.verify` and `carePlan.activate`
  from `protectedProcedure` to `providerProcedure` is a tiny contract
  change visible only to a patient-role caller (the request would now
  return `FORBIDDEN` instead of succeeding). No patient-side caller exists
  in the frozen contract, so the risk is contained — flag it in the PR
  description.
- **Action identity is not preserved across verifies.** The "edit / delete"
  semantics are expressed by replacing the full action set, so an action
  in the input is "the same as" its positionally-matching action in the
  previous saved set only by title/sourceText heuristics. For the demo
  this is fine (the seed has stable titles); for production this would
  need per-action ids. Document the heuristic in the procedure's TSDoc.
- **Patient-visibility is enforced at read time, not at write time.** The
  Patient queries (ISSUE-006) must filter to `status = "active"` AND
  `verified = true`. This issue does not own the queries; ISSUE-006
  inherits the invariant. The plan is committed to this and the
  `patient.*` procedures remain untouched here.
- **Source-text matching is case-insensitive and whitespace-collapsed.**
  This is generous to AI output and to edited copy. It is also a
  correctness tradeoff: a Provider can edit an action's `sourceText` to a
  similar but non-identical span. The UI shows the source sentence
  verbatim so the Provider can spot drift before saving.
- **No Drizzle transaction helper was confirmed in the codebase yet.**
  Step 3.2 / 3.3 assume `ctx.db.transaction(async (tx) => { ... })` is the
  Neon HTTP transactional entry point. Verify against the installed
  `drizzle-orm` version (`^0.44.5` per `packages/db/package.json`) at
  implementation time and fall back to a `BEGIN/COMMIT/ROLLBACK` block
  if the helper is not available — the audit-trail invariant requires
  atomicity either way.

## 6. Hand-off

When ISSUE-004 lands in `done/`:

1. Re-read the actual shape of `document.extract`'s response to confirm
   `carePlanId` and `sourceDocumentId` are returned (or, if not, raise
   the discrepancy before starting).
2. Run this plan top-to-bottom; the only file order that matters is
   3.1 (helper) → 3.2 / 3.3 (procedures) → 3.4 (no schema change) →
   3.6 / 3.7 / 3.8 (UI) → 3.10 (build).
3. Update this plan's §6 with the execution record (matches the format
   used by ISSUE-001 / ISSUE-003) before moving ISSUE-005 to `done/`.
