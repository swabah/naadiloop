# Naadi

A patient-owned, lifelong health record: providers file structured clinical data at the point of care; patients exclusively control who can read or write it. See `PRD.md` for full product context.

## Language

**Health ID**:
The unique, patient-facing identifier (`NAADI-XXXXXX`) generated at onboarding, encoded into the patient's QR code, and used by a provider to look up a patient before any consent exists.
_Avoid_: Patient ID, MRN, account number

**Patient**:
The person who owns a health record. The sole authority for granting, scoping, and revoking access to it — no other role can unilaterally grant access on a patient's behalf.
_Avoid_: User, account holder

**Provider**:
An institution or clinician (hospital, clinic, lab, pharmacy) that can request consent from a patient and, once approved, add structured encounters or read the patient's timeline.
_Avoid_: Doctor, hospital, clinician (too narrow — a lab or pharmacy is also a Provider)

**Encounter**:
One structured clinical record contributed by a Provider — a visit, diagnosis, prescription, lab result, immunization, or procedure. Encounters are immutable nodes on the Patient's timeline, not editable documents.
_Avoid_: Record, entry, upload

**Encounter Kind**:
The fixed category of an Encounter (`visit | diagnosis | prescription | lab_result | immunization | procedure`) that determines the shape of its structured data.
_Avoid_: Type, category

**Consent**:
A time-boxed, revocable grant from a Patient authorizing one specific Provider to read and/or write their record at a given Scope. Nothing a Provider does to a Patient's record is valid without an approved, unexpired Consent.
_Avoid_: Permission, authorization, access grant

**Scope**:
The breadth of a Consent — `summary` (default, limited read) or `full` (complete history read/write). A Consent's Scope is set by the Patient, never assumed by the Provider.
_Avoid_: Level, tier, permission level

**Break-glass**:
The one deliberate exception to the Consent rule: emergency access to a Patient's Emergency-Critical Layer with no login and no Consent, always paired with a synchronous Audit Log entry and patient disclosure. Break-glass never grants access to the full timeline.
_Avoid_: Emergency override, bypass, backdoor

**Emergency-Critical Layer**:
The narrow subset of a Patient's data (blood group, allergies, chronic conditions, emergency contact) readable via Break-glass. Distinct from the full timeline, which Break-glass never exposes.
_Avoid_: Emergency data, critical info

**Audit Log**:
The append-only, Patient-visible record of every foreign access to their data — every Provider read/write and every Break-glass event. A read that does not produce an Audit Log entry is treated as a defect, not an optimization.
_Avoid_: Access log, activity log, history log (pick Audit Log as canonical across code and UI copy)

**Time-boxed**:
Describes a Consent whose access rights lapse automatically at `expiresAt` without requiring an explicit revoke action. An expired Consent is handled identically to no Consent at all.
_Avoid_: Expiring, temporary

## Naadi Loop

**Care action**:
A single trackable instruction in a Care plan: a medicine, test, referral, or follow-up. It carries its provider-verified instructions, provenance, due date, and lifecycle status.
_Avoid_: Task, reminder, record

**Care plan**:
The provider-verified set of Care actions generated from one Source Document for one Patient. A draft or merely extracted plan is never patient-visible; it must be explicitly activated.
_Avoid_: Treatment plan (broader clinical meaning), checklist

**Loop closure**:
The point at which a Care action is completed, reviewed when required, and its next step has been communicated. Completion alone does not close a review-bearing action.
_Avoid_: Done, resolved

**Care gap**:
A deterministic operational signal that a care journey may have stalled, such as an overdue action, an unreviewed report, or a Patient request for help. It is not a diagnosis or medical prediction.
_Avoid_: Risk score, clinical alert

**Human gate**:
A mandatory Provider decision that AI cannot bypass. Naadi Loop has two: verification before a Care plan becomes patient-visible and review before a result-bearing action can close.
_Avoid_: Approval step, AI validation
