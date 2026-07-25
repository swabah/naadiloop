# ISSUE-012 — Demo Seed Data, Rehearsal & Deployment

**Blocked by:** 011 (Responsive Layout, Branding & Loop Visualization)
**PRD refs:** §2.2, §12.4, §16, §17, §18, §19

## Why

The hackathon outcome is a reliable, publicly reachable, sub-three-minute demonstration of the complete care loop using real application procedures and database state. A feature that only works with developer intervention is not demo-ready.

## Scope

### Backend / Logic scope

- Finalize idempotent seed data for one Provider and at least two fictional Patients.
- Include the reference Care plan, all four Care action types, an overdue referral, and an awaiting-review test report.
- Provide a repeatable demo reset/reseed command.
- Configure production-safe environment variables for database, server, web origin, and AI access.
- Validate that all five demo beats use real tRPC calls and persisted database data.

### Frontend / UI scope

- Provide a predictable demo entry point and visible Provider/Patient switch.
- Ensure the reference document, sample report, and intended review comment path are ready.
- Deploy the web and API to publicly reachable production URLs.
- Rehearse the PRD §18 script twice, keeping the complete run under three minutes.
- Prepare an honest fallback for live AI failure without presenting seeded output as live extraction.

## Acceptance Criteria

- [ ] Seeding is idempotent and produces the documented fictional reference scenario.
- [ ] A reset/reseed restores the demo to its starting state without manual database editing.
- [ ] Document → extraction → verification → activation works through real tRPC procedures.
- [ ] Patient completion and report upload persist through real tRPC procedures.
- [ ] Dashboard Care gaps are produced by deterministic rules, not hard-coded UI cards.
- [ ] Provider review, next-step communication, optional follow-up, and loop closure persist correctly.
- [ ] No developer console or direct database intervention is required during the demo.
- [ ] The complete script runs in under three minutes in two consecutive rehearsals.
- [ ] A publicly reachable deployment exists and its health/API checks pass.
- [ ] No real PHI, secret, or local `.env` value is committed.
- [ ] The AI fallback is labeled and does not weaken the verification gate.

## Risks / Open Questions

- Deployment credentials and creation of external hosting resources require explicit owner authorization when implementation begins.
- Live AI and hosting availability remain external dependencies; the fallback should preserve the story without misrepresentation.

