# ISSUE-004 — Document Input & AI Extraction

**Blocked by:** 003 (Patient Management & Provider Shell)
**PRD refs:** §6.1 (US-2/US-3), §7.1, §9, §11, §14, §18

## Why

The product is valuable only if unstructured medical instructions can become structured, trackable Care actions without the Provider retyping the document. AI has exactly one job in this MVP: extraction, with strict provenance and no clinical interpretation.

## Scope

### Backend / Logic scope

- Implement `document.create` for pasted text and text extracted from a supported digital PDF.
- Add `packages/ai` with a server-only extraction helper.
- Implement `document.extract` with strict structured output for MEDICATION, TEST, REFERRAL, and FOLLOW_UP actions.
- Enforce the fields `type`, `title`, `instructions`, `dueDate`, `priority`, and `sourceText`.
- Use low temperature, strict JSON parsing, and at most one retry after parse failure.
- Reject or flag any extracted `sourceText` that cannot be found in the source document.
- Keep AI credentials and calls on the server.

### Frontend / UI scope

- Replace the Provider document-input placeholder with paste and digital-PDF controls.
- Show supported-input guidance: pasted text and digitally generated PDFs are the happy path; scanned OCR is best-effort.
- Display extraction progress and a clear failure state with Retry and manual-entry options.
- On success, pass the draft actions and document context to the verification route.

## Acceptance Criteria

- [ ] A Provider can save pasted medical instructions against the selected Patient.
- [ ] A supported digital PDF can supply extractable text without making scanned OCR a demo dependency.
- [ ] Extraction returns all required fields and supports all four Care action types.
- [ ] Every returned `sourceText` is traceable to the submitted document.
- [ ] Extraction completes within approximately ten seconds on the reference document under normal API conditions.
- [ ] Invalid AI output receives no more than one automatic retry.
- [ ] Failure never activates a Care plan or exposes draft actions to the Patient.
- [ ] The implementation contains no diagnosis, lab interpretation, treatment recommendation, risk score, or autonomous urgency decision.
- [ ] The reference discharge summary produces a usable four-action draft for the demo.

## Risks / Open Questions

- Live model availability can fail during judging; Issue 012 must seed a fallback without disguising it as a live result.
- PDF text extraction should remain deliberately narrow so production OCR does not enter the critical path.

