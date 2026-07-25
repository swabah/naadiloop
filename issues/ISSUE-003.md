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

- [ ] A Provider can see persisted Patients through a real tRPC query.
- [ ] A Provider can create a Patient with a name and optional profile/contact fields.
- [ ] Refreshing the page preserves the newly created Patient.
- [ ] Selecting a Patient navigates with the correct `patientId`.
- [ ] Seeded Provider and Patient identities support the demo role-switch flow.
- [ ] Input validation failures are displayed in plain language.
- [ ] No real PHI or production authentication claim is introduced.
- [ ] Loading, empty, and API-error states render without breaking navigation.

## Risks / Open Questions

- The MVP role toggle is a demo convenience, not an authorization boundary; UI copy must not present it as secure authentication.
- Patient phone numbers and caregiver details are fictional demo data only.

