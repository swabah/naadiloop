# Naadi Loop — Product Requirements Document

| | |
|---|---|
| **Product** | Naadi Loop |
| **Tagline** | *No patient lost between prescription and recovery.* |
| **Version** | 1.0 (Hackathon MVP) |
| **Status** | Approved for build |
| **Delivery window** | 4 hours |
| **Target stack** | React + Vite + TanStack Router + Tailwind v4 · Hono + tRPC · Drizzle + Neon Postgres · Biome |

---

## 1. Summary

Naadi Loop turns a discharge summary, prescription, or referral into a **provider-verified care journey**, then tracks every medicine, test, referral, report, and follow-up **until the loop is closed** — i.e. until the action is completed *and* its result is reviewed *and* the next instruction is communicated.

It is **not** an EHR, a hospital-management system, or a health-record database. Its single responsibility is to **prevent patients from getting lost after receiving medical instructions**.

**The one innovation this PRD protects:** most tools *store* records or *remind* patients. Naadi Loop tracks whether the *complete care process moved from instruction → completion → clinical review*. That state transition is the product.

**ABDM positioning:** ABDM makes records portable. Naadi Loop makes care complete.

---

## 2. Problem

After a visit, a patient leaves with instructions scattered across prescriptions, discharge summaries, referral slips, lab forms, verbal advice, and WhatsApp messages. The patient must interpret and manage all of it alone.

Meanwhile the provider has no reliable signal about whether the test was completed, the referral attended, the report reviewed, or the follow-up missed — **the care journey silently breaks and no one notices.**

---

## 3. Goals & Non-Goals

### Goals

- G1 — Convert unstructured medical instructions into structured, trackable care actions.
- G2 — Keep a human provider in the loop: **no action activates without provider verification.**
- G3 — Give patients a single, jargon-free "what do I do next?" experience.
- G4 — Detect incomplete care deterministically and surface it to the provider.
- G5 — Close the loop only when action + review + next-step are all done.

### Non-Goals (explicitly out of scope this cycle)

Full EHR · real ABDM/HMS integration · production OCR · emergency break-glass · AI diagnosis or lab interpretation · telemedicine · medicine delivery · billing/insurance · appointment marketplace · symptom-monitoring engine · full medication-scheduling engine.

> The Non-Goals list is a **contract**. Features here are not "later phases we started" — they are actively excluded to protect the 4-hour scope.

---

## 4. Success Metrics

### Product north-star (post-hackathon framing)

| Metric | Definition | Why it matters |
|---|---|---|
| **Loop-closure rate** | % of care actions that reach `CLOSED` within their due window | The core outcome — care actually completed, not just issued |
| **Time-to-review** | Median time from report upload → provider `REVIEWED` | Measures whether results get acted on |
| **Care-gap visibility** | % of overdue/unreviewed actions surfaced on the dashboard (target: 100%) | No silent failures |
| **Extraction quality** | Avg. provider edits per generated plan (lower is better) | AI usefulness without over-trust |

### Hackathon acceptance criteria (the bar for "done")

- The full reference scenario (§10) runs **end-to-end in under 3 minutes** with no developer intervention.
- All five demo moments (§16) pass on seeded data.
- At least one care gap is detected and displayed by a deterministic rule.
- Every AI-generated action is provider-verified before the patient sees it.

---

## 5. Personas

| Persona | Needs | In MVP |
|---|---|---|
| **Patient** (primary) | Know the single next step; confirm actions; upload a report; ask for help — without reading medical documents | Full patient interface |
| **Provider / Coordinator** | Turn a document into a plan fast; verify it; see who's falling through the cracks; close reviews | Full provider interface; coordinator = same account as provider in MVP |
| **Caregiver** | Support a dependent's journey | Represented only via patient's "request help" + caregiver contact field; no dedicated screen this cycle |

---

## 6. The Loop (core mental model)

```text
Medical instruction
   → Upload / paste document
   → AI extracts care actions
   → Provider verifies actions          ← human gate
   → Care journey activated
   → Patient completes medicine/test/referral
   → Report / outcome uploaded
   → Provider reviews result            ← human gate
   → Follow-up action created (if needed)
   → Care loop CLOSED
```

The two human gates (verify, review) are non-negotiable and are also the trust story.

---

## 7. Functional Requirements

Priority uses MoSCoW: **M**ust / **S**hould / **C**ould / **W**on't (this cycle).

### 7.1 Care-plan creation & extraction

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-1 | M | Provider selects or creates a demo patient | Patient list visible; add-patient captures name, age, phone, language, caregiver contact; selecting opens the patient's journey |
| FR-2 | M | Provider inputs instructions via pasted text or uploaded file | Pasted text and digitally generated PDF are the supported happy path; scanned-image OCR is best-effort only |
| FR-3 | M | System extracts structured care actions from the input (AI) | Returns the relevant subset of the four action types; each action carries `type`, `title`, `instructions`, `dueDate`, `sourceText`; completes in < ~10s |

### 7.2 Verification (human gate #1)

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-4 | M | Provider reviews every extracted action before activation | Each action is an editable card showing type, instructions, due date, priority, assignee, and its **linked source sentence**; edit / delete / add supported |
| FR-5 | M | No action becomes patient-visible without explicit confirmation | "Activate care journey" is the only path to patient visibility; activation writes an audit event |

### 7.3 Patient journey

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-6 | M | Patient sees one prominent "next action" | Home screen shows the immediate due/pending action in plain language, no jargon required |
| FR-7 | M | Patient sees the full journey as an ordered timeline | All actions listed with status (completed / pending / upcoming / locked) and a progress count ("2 of 6 completed") |
| FR-8 | S | Patient can open action details | Shows instructions, deadline, source, and a completion CTA |

### 7.4 Completion & upload

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-9 | M | Patient marks an action completed | Status transitions and an event is logged. Medication supports Taken / Skipped / Remind / Help (1–2 confirmations — **not** a full scheduler) |
| FR-10 | M | Patient uploads a report against a TEST action | Upload sets status `AWAITING_REVIEW`; patient sees "awaiting provider review" |
| FR-11 | S | Patient can request help | Options: caregiver help, transport, "didn't understand," contact provider — each raises a care-gap flag |

### 7.5 Provider review & loop close (human gate #2)

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-12 | M | Provider dashboard surfaces what needs attention | Sections: Requires attention · Awaiting review · Overdue · On track |
| FR-13 | M | Provider reviews a report and closes / creates follow-up | View report + related task; add comment; mark reviewed; optionally spawn a new follow-up action; patient's next action updates |
| FR-14 | M | An action is `CLOSED` only when completed **and** reviewed **and** next step communicated (if any) | Enforced by the state machine (§9); loop-closed state reflected to the patient |

### 7.6 Care-gap detection

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-15 | M | System flags gaps via deterministic rules (§11) | Rules evaluated on read/refresh; flagged items appear on the dashboard; presented as **operational alerts, not medical judgments** |

### 7.7 AI scope

| ID | Pri | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-16 | M | AI performs exactly one job: instruction → structured actions | Obeys the JSON contract (§8); provider verifies every output; nothing auto-activates |
| FR-17 | W | AI does **not** diagnose, interpret labs, recommend medication, predict deterioration, or set urgency autonomously | These behaviours are absent from the build and from the pitch |

---

## 8. AI Requirements & Guardrails

**Single task:** convert medical instructions into structured care actions. Nothing else.

**Structured output contract:**

```json
{
  "actions": [
    {
      "type": "MEDICATION",
      "title": "Take Tablet A",
      "instructions": "Take twice daily after food for five days",
      "dueDate": "2026-07-30",
      "priority": "NORMAL",
      "sourceText": "Take Tablet A twice daily after food for five days"
    }
  ]
}
```

**Guardrails:**
- Low temperature, strict JSON output, one retry on parse failure.
- Every `sourceText` must map to a span in the input (traceability = trust).
- The provider-verification gate (FR-4/5) is itself the primary safeguard: the AI proposes, the human disposes.
- **Never claim** diagnosis, lab interpretation, medication recommendation, deterioration prediction, or autonomous urgency scoring.

---

## 9. Data Model & State Machine

Keep the schema small. Six entities.

**Patient** — `id, name, age, phone, language, caregiverContact`
**SourceDocument** — `id, patientId, documentType, content, uploadedAt`
**CarePlan** — `id, patientId, providerId, status, createdAt, verifiedAt`
**CareAction** — `id, carePlanId, type, title, instructions, dueDate, status, priority, sourceText, assignedTo, reviewRequired, verified`
**Report** — `id, careActionId, fileUrl, status, providerComment, uploadedAt, reviewedAt`
**ActionEvent** — `id, careActionId, eventType, createdBy, timestamp, notes`  *(the audit trail; also powers loop-closure metrics)*

### Action types (exactly four)

```text
MEDICATION · TEST · REFERRAL · FOLLOW_UP
```

### Unified status model

One state machine for all actions. `reviewRequired` (true for TEST and outcome-bearing REFERRAL) decides whether the review states apply. `OVERDUE` is a **derived flag** (due date passed, not yet completed), not a separate lifecycle branch.

```text
PENDING → DUE → COMPLETED → [AWAITING_REVIEW → REVIEWED] → CLOSED
                      └───────────── (if reviewRequired = false) ──────────→ CLOSED
                (OVERDUE = derived when DUE date passes without completion)
```

Referral stages map onto the same model instead of a parallel one:

| Referral stage | Maps to |
|---|---|
| ISSUED | PENDING |
| ACCEPTED | DUE |
| ATTENDED | COMPLETED |
| OUTCOME_RETURNED | AWAITING_REVIEW → REVIEWED |
| CLOSED | CLOSED |

This collapse is the refinement: **one status enum, one set of transitions, referral as a mapping** — faster to implement and easier to explain than two models.

---

## 10. Care-Gap Rules (deterministic — no prediction)

| ID | Rule | Condition |
|---|---|---|
| CG-1 | Overdue action | due date passed AND status ≠ COMPLETED/CLOSED |
| CG-2 | Unreviewed report | report uploaded AND status = AWAITING_REVIEW |
| CG-3 | Incomplete referral | referral ISSUED but not ATTENDED before due date |
| CG-4 | Patient needs support | patient selected "Need help" |
| CG-5 | Medication adherence warning | two consecutive doses unconfirmed |

Easy to implement, easy to defend to judges, and honest about *not* being AI prediction.

---

## 11. Primary User Flow (reference scenario)

**Scenario:** a patient at a PHC with recurring chest discomfort. The doctor issues a cardiology referral, a blood test, medication twice daily, and a 7-day follow-up.

1. **Provider creates the plan** — selects the patient, pastes the instruction text, clicks *Generate care journey*. Four actions appear (MEDICATION, TEST, REFERRAL, FOLLOW_UP).
2. **Provider verifies** — each action links to its source sentence; provider fixes one due date and activates.
3. **Patient journey** — patient home shows *"Complete CBC test tomorrow."* Patient marks the test done and uploads a sample report → status `AWAITING_REVIEW`.
4. **Care-gap detection** — dashboard shows the CBC report awaiting review, plus a seeded overdue referral.
5. **Loop close** — provider opens the report, comments *"Reviewed. Continue medication and attend cardiology consultation,"* marks reviewed; the patient's next action updates.

---

## 12. Screens (three interfaces)

**Provider:** (1) Patient selection · (2) Document input · (3) Verify care plan (action cards) · (4) Dashboard — Requires attention / Awaiting review / Overdue / On track · (5) Report review.

**Patient:** (1) My next action · (2) My care journey (timeline) · (3) Action details · (4) Report upload · (5) Help request.

**Coordinator:** overdue actions · reports awaiting review · open referrals · patients needing assistance — **served by the same provider account in the MVP.**

---

## 13. Non-Functional Requirements & Constraints

- **Performance:** AI extraction < ~10s; all other interactions feel instant on seeded data.
- **Input constraint:** demo happy-path is pasted text or digital PDF; do not gate the demo on scanned-image OCR.
- **Data:** no real PHI; seeded demo patients only. Report "upload" may use a mock file URL if real storage is not wired.
- **Auth:** seeded patient/provider logins or a role toggle — no real identity system this cycle.
- **Roles:** patient and provider views must be switchable within one demo session.
- **Dates:** seed all due dates relative to demo day to avoid stale/overdue confusion on stage.

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Live AI extraction flakes or hallucinates on stage | Low-temp strict-JSON prompt + one retry; **pre-seed a verified example**; keep a recorded fallback; the verify gate means nothing wrong ever reaches the patient — turn this into the pitch |
| Scope creep past 4 hours | Non-Goals list is a contract; hard feature-freeze at 3:15 |
| Two status models create bugs | Unified state machine (§9); referral mapped, not duplicated |
| Scanned-image OCR unreliable | Constrain demo input to pasted text / digital PDF |
| Role-switch confusion mid-demo | Seed two logins or a visible role toggle; rehearse the switch |
| Report storage not ready | Accept a mock `fileUrl`; review flow doesn't depend on real bytes |

---

## 15. Milestones (4-hour plan)

| Time | Milestone | Exit gate |
|---|---|---|
| 0:00–0:30 | Lock schema, action types, status enum, API contract, demo scenario; prep sample docs + seed | Everyone builds against shared types |
| 0:30–1:30 | Parallel: patient UI · provider UI · backend schema+APIs · AI extraction | Each surface renders on mock data |
| 1:30–2:30 | Connect **document → extraction → verification → patient journey** | **Mandatory milestone #1** works on real data |
| 2:30–3:15 | Complete the loop: patient completion · report upload · provider review · dashboard alerts | Loop closes end-to-end |
| 3:15–4:00 | Feature-freeze, polish, one Malayalam element, seed failure scenarios, rehearse, slides | Clean <3-min run-through |

**Team split:** M1 patient experience · M2 provider experience · M3 backend & workflow (schema, status transitions, care-gap detection, seed) · M4 AI & integration (extraction, sample docs, coordinator dashboard, demo prep).

### Priority order

**Must build:** instruction input → structured extraction → provider verification → patient journey → action completion → report upload → provider review → care-gap dashboard.
**Only if time remains:** Malayalam TTS · caregiver dashboard · browser notifications · QR patient access · ABDM-style consent simulation.

---

## 16. Demo Acceptance Script (~3 min)

1. **Document → pathway** — paste a discharge summary, click *Generate care journey*, four actions appear instantly.
2. **Verification** — show each action's link to its source sentence; correct one due date; activate.
3. **Patient journey** — switch to patient; show *"Next: complete CBC test tomorrow"*; mark completed; upload a report.
4. **Care-gap detection** — switch to provider dashboard; show CBC awaiting review + a seeded overdue referral.
5. **Close the loop** — open the report, comment, mark reviewed; switch back to patient and show the updated next action.

Close on: *"ABDM makes records portable. Naadi Loop makes care complete."*

---

## 17. Open Questions

- Notification channel beyond in-app (SMS/WhatsApp) — deferred; assumption is in-app only for MVP.
- Which Malayalam elements ship (labels vs. TTS) — currently a "could."
- Real report storage vs. mock URL for the MVP demo.
- Cross-provider referral outcome entry — simulated screen now; real multi-provider handoff later.
- Provider identity/authorization model beyond seeded accounts.
- Where the coordinator role diverges from the provider role in production.

---

## 18. Glossary

- **Care action** — a single trackable instruction (medicine, test, referral, follow-up).
- **Care plan** — the provider-verified set of actions generated from one document.
- **Loop closure** — an action reaching `CLOSED`: completed, reviewed, and next step communicated.
- **Care gap** — a deterministically detected break in the journey (overdue, unreviewed, etc.).
- **Human gate** — a mandatory provider checkpoint (verification, review) that AI cannot bypass.

---

*Design principle to hold the line on: Naadi Loop tracks a process, not a document. If a decision doesn't help an instruction travel from issued → completed → reviewed, it's out of scope for this cycle.*
