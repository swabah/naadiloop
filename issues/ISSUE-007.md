# ISSUE-007 — Action Completion, Report Upload & Help Request

**Blocked by:** 006 (Patient Journey: Next Action & Timeline)
**PRD refs:** §6.4 (US-9/US-10/US-11), §7.2, §8.3–8.4, §10, §14, §18

## Why

A visible journey is not enough: Patients must be able to advance it. Completion, report return, and requests for support are the signals that allow the Provider and system to detect whether care is progressing.

## Scope

### Backend / Logic scope

- Implement `patient.markCompleted`, `patient.skipDose`, `patient.uploadReport`, and `patient.requestHelp`.
- Support medication outcomes Taken, Skipped, Remind, and Help without building a full scheduling engine.
- Enforce permitted state transitions and write the matching Action event atomically.
- Accept report metadata or a demo-safe file URL only for TEST actions, create a Report, and transition the action to `AWAITING_REVIEW`.
- Record help requests with the selected kind and support a Patient-level help request when there is no current action.
- Adjust the Action event relationship if necessary to permit the PRD-required null `careActionId` for Patient-level help.

### Frontend / UI scope

- Add completion controls appropriate to each action type.
- Add Taken, Skipped, Remind, and Help controls for medication actions.
- Replace the report-upload placeholder with file selection, confirmation, progress, success, and error states.
- Replace the help placeholder with caregiver help, transport, unclear instructions, and contact-Provider options.
- Refresh the next action and timeline after successful mutations.

## Acceptance Criteria

- [ ] Completing an action changes its state and writes an Action event in the same operation.
- [ ] Medication supports Taken, Skipped, Remind, and Help outcomes without implying dose scheduling.
- [ ] A TEST report upload creates a Report and moves the action to `AWAITING_REVIEW`.
- [ ] Uploading a report to a non-TEST action is rejected with a clear message.
- [ ] The Patient sees “awaiting provider review” after a successful report upload.
- [ ] Every help option produces a `HELP_REQUESTED` event with its reason.
- [ ] A help request without a current action is supported and remains dashboard-visible.
- [ ] Double submission and invalid transition errors do not silently duplicate events.
- [ ] Successful mutations update the Patient's next action and timeline.

## Risks / Open Questions

- Real binary storage is not required; the review flow may use a mock file URL, but the UI must be honest about demo behavior.
- The current non-null Action event foreign key conflicts with Patient-level help and must be intentionally migrated rather than bypassed.

