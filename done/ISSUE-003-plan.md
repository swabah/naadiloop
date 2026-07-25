# Plan — ISSUE-003: Patient Management & Provider Shell

## 1. Goal

Turn the Provider patient-selection placeholder into the first persisted Naadi Loop workflow. Seeded demo identities will support an explicit demo-only role switch, while Providers can list and create fictional Patients and continue to the selected Patient's document-input route.

## 2. Interface first

No database migration is required. The existing `patients` table already stores the required profile fields and stable UUID.

The frozen tRPC contract will receive its ISSUE-003 implementation at these existing procedures:

```ts
auth.login({ email }) -> AuthedUser
auth.me() -> AuthedUser
patient.list() -> Patient[]
patient.create(PatientCreateInput) -> Patient
```

- `auth.login` accepts only the two seeded demo emails and returns a plain unauthorized error for other identities.
- `auth.me` resolves the seeded identity from the existing `x-demo-role` request header.
- `patient.list` and `patient.create` require the seeded Provider role.
- `patient.create` trims text, converts empty optional strings to `undefined`, validates age and contact values, and returns the inserted database row.
- All other frozen procedures remain `NOT_IMPLEMENTED`.

`getDb()` remains the only database adapter and `AppRouter` remains the frontend/backend contract.

## 3. Implementation steps

1. Expose seeded demo-user lookup helpers from the API context and add a Provider-only tRPC procedure guard.
2. Implement `auth.login` and `auth.me` without sessions, passwords, or production-auth claims.
3. Strengthen the existing Patient input schema with plain-language validation and optional-value normalization.
4. Implement Provider-only Patient list/create queries using the existing Drizzle schema and stable database-generated UUIDs.
5. Connect the header's role toggle to `auth.login`, label it as a demo view selector, and retain the local role header used by the API context.
6. Replace the Provider Patients placeholder with responsive loading, empty, retry/error, list, and add-Patient states.
7. Navigate a selected Patient to `/provider/patients/$patientId/document` using the returned identifier.
8. Verify persistence against the existing isolated Neon development branch, then complete the issue tracking records only after all checks pass.

## 4. Verification

- `pnpm check`, `pnpm typecheck`, and `pnpm build` pass.
- The server health route and implemented tRPC procedures respond while development apps are running.
- Both seeded emails authenticate; an unknown email fails with a readable unauthorized message.
- Patient creation rejects invalid inputs with plain-language errors and normalizes empty optional values.
- A uniquely named fictional Patient can be created, retrieved in a later list request, and remains visible after a fresh request.
- A Patient card links to the document route with the exact persisted `patientId`.
- Provider and Patient demo views remain navigable at mobile and desktop widths.
- Final diff contains no credentials, real PHI, unrelated changes, or implementations from later issues.

## 5. Risks

- The role selector is deliberately not a security boundary. UI copy and API messages must consistently call it a demo view, not secure authentication.
- Contact fields are sensitive in a production system; this issue uses fictional demo data only and does not add logging, analytics, or real data.
- A database-backed integration check must use an isolated development branch and clearly label any retained verification record as fictional demo data.

## 6. Completion note

Implementation followed this plan without a schema or contract change. The verification Patient was intentionally retained as clearly labelled fictional demo data so persistence remains directly observable in the Provider list.
