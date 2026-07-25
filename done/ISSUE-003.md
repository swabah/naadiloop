# ISSUE-003 — Patient Management & Provider Shell

**Blocked by:** 002 (Codebase & Spec Audit)
**PRD refs:** §4, §6.1 (US-1), §7.1, §11, §18

## Why

Every Care plan must belong to an identifiable Patient and be operated by the seeded Provider. Before documents or Care actions can be created, the demo needs a real patient-selection flow and a simple, explicit way to switch between Provider and Patient views.

## Scope

### Backend / Logic scope

- Implement the demo authentication procedures (`auth.login`, `auth.me`) using seeded identities; production authentication is out of scope.
- Implement `patient.list`, `patient.create`, and the Provider-facing patient list.
- Persist name, age, phone, language, and optional caregiver contact.
- Validate required fields and normalize optional empty values.
- Return stable patient identifiers for downstream document and Care plan routes.

### Frontend / UI scope

- Replace the Provider patient-selection placeholder with a patient list, empty/loading/error states, and an add-patient dialog or form.
- Navigate from a selected Patient to that Patient's document-input route.
- Make the demo role toggle clearly distinguish Provider and Patient views without implying production-grade authorization.
- Keep terminology aligned with `CONTEXT.md`: Patient, Provider, Care plan, and Care action.

## Acceptance Criteria

- [x] A Provider can see persisted Patients through a real tRPC query.
- [x] A Provider can create a Patient with a name and optional profile/contact fields.
- [x] Refreshing the page preserves the newly created Patient.
- [x] Selecting a Patient navigates with the correct `patientId`.
- [x] Seeded Provider and Patient identities support the demo role-switch flow.
- [x] Input validation failures are displayed in plain language.
- [x] No real PHI or production authentication claim is introduced.
- [x] Loading, empty, and API-error states render without breaking navigation.

## Risks / Open Questions

- The MVP role toggle is a demo convenience, not an authorization boundary; UI copy must not present it as secure authentication.
- Patient phone numbers and caregiver details are fictional demo data only.

## Implementation record

- Implemented seeded demo login/identity resolution and a Provider-only patient-management guard.
- Implemented real Drizzle-backed `patient.list` and `patient.create` procedures without changing the database schema.
- Added plain-language validation for Patient name, age, phone, language, and caregiver contact, including blank optional-value normalization.
- Replaced the Provider placeholder with the persisted Patient list, add dialog, responsive states, and typed navigation to the selected Patient's document route.
- Verified both seeded identities, unknown-identity rejection, Provider authorization, Neon persistence, exact UUID navigation, and the mobile/desktop layouts.
- Standards review passed: the frozen router and `getDb()` seams remain intact, later procedures remain stubbed, and checks/builds pass.
- Specification review passed against every acceptance criterion and PRD §6.1 US-1 / §7.1.
