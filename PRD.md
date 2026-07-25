# Naadi Loop — Product Requirements Document

**Status:** Draft for hackathon build (4-hour scope)
**Source:** Refined from `PRD.md` (Naadi platform PRD) and `naadi-loop-prd.md` (Loop MVP)
**Owners:** 4-person build team (see §16)

---

## 1. Overview

**One-liner:** Naadi Loop turns a discharge summary, prescription, or referral into a **provider-verified care journey**, then tracks every medicine, test, referral, report, and follow-up **until the loop is closed** — instruction completed, result reviewed, next step communicated.

**Positioning:** Naadi Loop is the current MVP of the broader Naadi platform — a patient-owned, lifelong health record where providers file structured clinical data at the point of care and patients exclusively control who can read or write it. The platform's long-term north star is **continuous, patient-controlled record portability** (the ABDM/ABHA vision). Naadi Loop is the focused slice we are proving first:

> **ABDM makes records portable. Naadi Loop makes care complete.**

The platform's full consent architecture (patient-issued, time-boxed, revocable access grants; break-glass for emergencies; always-on audit log) is the long-term direction. **The Loop MVP deliberately narrows to a single institution and a single provider-patient relationship** to prove the care-completion mechanism end-to-end. Consent, audit, and cross-provider access are deferred to post-hackathon milestones — listed in §17 and called out as stretch in the cut list (§15), not silently dropped.

**Tagline:** *No patient lost between prescription and recovery.*

### 1.1 Problem statement

After a visit, a patient leaves with instructions scattered across prescriptions, discharge summaries, referral slips, lab forms, verbal advice, and WhatsApp messages. The patient must interpret and manage all of it alone.

Meanwhile the provider has no reliable signal about whether the test was completed, the referral attended, the report reviewed, or the follow-up missed — **the care journey silently breaks and no one notices.**

Most digital-health tools conflate two jobs:

1. **Storage** — making the instruction findable (EHRs, patient portals, scanned PDFs).
2. **Tracking** — making the instruction *travel through to completion and review*.

Naadi Loop does only the second, and it does it as a **process** — not a document. The state transition *instruction → completion → review → next step communicated* is the product.

### 1.2 Solution

Naadi Loop separates the loop cleanly:

- **Provider owns the verification.** A document (discharge summary, prescription, referral) is converted by AI into a structured set of care actions, but **no action becomes patient-visible until a human provider verifies and activates it**. AI proposes, the human disposes.
- **Patient owns the progression.** The patient sees one prominent "next action" in plain language, with a full timeline of the journey, and confirms each action as completed (or uploads a report against a test).
- **Provider owns the review.** When a test report comes back, the provider reviews it, comments, and either closes the loop or spawns a follow-up action. The patient sees the next step update.
- **The system owns the detection.** Deterministic rules flag overdue actions, unreviewed reports, incomplete referrals, and patients asking for help — surfaced to the provider dashboard as operational alerts, never as medical judgments.

The product is a process-tracker with two human gates, not a document store.

---

## 2. Goals & Success Metrics

### 2.1 Product goals

| Goal | Why it matters |
|---|---|
| Convert unstructured medical instructions into structured, trackable care actions | The whole pitch collapses if every action is a free-text field the provider re-types by hand |
| Keep a human provider in the loop on every transition | Trust comes from the human gates, not the AI extraction; without them, the product is just another screen |
| Give patients a single, jargon-free "what do I do next?" experience | Honor the tagline — *no patient lost* means the patient is never the integration layer |
| Detect incomplete care deterministically and surface it to the provider | Silent failures are the failure mode; detection is the product |
| Close the loop only when action + review + next-step are all done | Loop closure is the single state transition that defines the product |

### 2.2 Demo-success metrics (hackathon-scoped)

"Success" is measured against the demo script (§18), not production KPIs:

- The full reference scenario (§11) runs **end-to-end in under 3 minutes** with no developer intervention.
- All five demo beats run on **real data through real tRPC procedures** (not mocked responses) by the 3:00 mark.
- At least one care gap is detected and displayed by a deterministic rule, on stage.
- Every AI-generated action is provider-verified before the patient sees it.
- Deployed, publicly reachable URL exists by 4:00.

### 2.3 Post-hackathon success metrics (north-star + roadmap)

| Metric | Definition | Why it matters |
|---|---|---|
| **Loop-closure rate** | % of care actions that reach `CLOSED` within their due window | The core outcome — care actually completed, not just issued |
| **Time-to-review** | Median time from report upload → provider `REVIEWED` | Measures whether results get acted on |
| **Care-gap visibility** | % of overdue/unreviewed actions surfaced on the dashboard (target: 100%) | No silent failures |
| **Extraction quality** | Avg. provider edits per generated plan (lower is better) | AI usefulness without over-trust |
| **Closed-loop reuse rate** | % of `CLOSED` loops whose stored history (§5.1) is opened/referenced during a later consultation or referral | Validates the "medical footprint" claim — stored history must actually get used by future providers, not just retained |

---

## 3. Non-Goals / Out of Scope

The Non-Goals list is a **contract**. Features here are not "later phases we've started" — they are actively excluded to protect the 4-hour scope.

- **Full EHR / health-record database.** The platform's long-term record-and-consent vision (see §1) is out of scope for this MVP; the Loop runs in a single institution on a single provider-patient relationship.
- **Real ABDM/HIPAA/DPDP regulatory compliance**, real hospital system integrations, real OTP/SMS gateways.
- **Production OCR.** Pasted text and digitally generated PDFs are the supported happy path; scanned-image OCR is explicitly best-effort only and must not gate the demo.
- **AI diagnosis, lab interpretation, medication recommendation, deterioration prediction, or autonomous urgency scoring.** The AI performs exactly one job (instruction → structured actions) and never crosses the line.
- **Telemedicine, medicine delivery, billing/insurance, appointment marketplace, symptom-monitoring engine, full medication-scheduling engine.** Listed here to remove them from the discussion, not to defer them.
- **Emergency break-glass, patient-issued consent grants, cross-provider access.** Documented as the platform's long-term model; deferred to post-hackathon. The MVP does not need them because the demo is single-institution.
- **Caregiver/delegated access.** Caregiver is represented only via the patient's "request help" option and caregiver contact field; no dedicated caregiver screen this cycle.
- **Native mobile apps.** Web-only, responsive.
- **Real-time notification transport (push/SMS).** Polling every 3s stands in for "real-time" in the demo.

---

## 4. Personas

| Persona | Description | Core need from Naadi Loop |
|---|---|---|
| **Patient** (primary) | An adult discharged from a PHC with a prescription, a test order, a referral, and a follow-up date — none of which they feel confident managing | A single, plain-language "what do I do next?" surface, plus a way to confirm completion and upload a report without re-reading the discharge summary |
| **Provider / Doctor** | A clinician issuing multiple instructions per visit who currently has no signal once the patient walks out | Turn a document into a verified plan fast; see who's falling through the cracks; close reviews |
| **Coordinator** | A clinic staff member who chases overdue tests, missed referrals, and reports awaiting review | Same account as provider in the MVP; represented by the dashboard, not a separate role |
| **Caregiver** | Family member or helper who supports the patient through the journey | Represented only via the patient's "request help" flow and caregiver contact field; no dedicated screen this cycle |

---

## 5. The Loop (core mental model)

```text
Medical instruction
   → Upload / paste document
   → AI extracts care actions
   → Provider verifies actions          ← human gate #1
   → Care journey activated
   → Patient completes medicine/test/referral
   → Report / outcome uploaded
   → Provider reviews result            ← human gate #2
   → Follow-up action created (if needed)
   → Care loop CLOSED
```

The two human gates (verify, review) are non-negotiable. They are also the trust story — the AI proposes, the human disposes, and a loop is only closed when both human and machine parts agree.

### 5.1 Closed loops stay stored

A `CLOSED` loop is not deleted or archived out of view — it remains stored as **searchable history** on the patient's journey. This is not a shift toward a full record database (§3 Non-Goals still holds); it is a direct consequence of the ordered timeline and `ActionEvent` audit trail the product already keeps (§6.3, §8.3).

Concretely, the persisted history serves **future providers, not just the current one**. For any closed action, the timeline shows:

- what was issued (the original instruction and its source text),
- what was completed (and when),
- what was reviewed (the provider's comment),
- what the outcome was,
- what the next instruction became (the spawned follow-up, if any).

A referral or follow-up visit inherits this trail instead of starting blank — a future doctor sees not just that "medication was prescribed" but that it was taken, reviewed, and what happened next. This is what makes the Loop feel like a **medical footprint** rather than a one-time task list, without expanding the product into an EHR.

---

## 6. User Stories

Each maps to a demo beat (§18) and a build owner (§16). Priority uses MoSCoW: **M**ust / **S**hould / **C**ould / **W**on't (this cycle).

### 6.1 Care-plan creation & extraction

- **US-1 (M):** As a provider, I can select an existing patient or add a new one (name, age, phone, language, caregiver contact) so the planned journey is anchored to a real person.
  - *Acceptance:* Patient list renders; add-patient persists; selecting a patient opens their journey.
- **US-2 (M):** As a provider, I can paste a discharge summary or upload a digital PDF so the system has something to extract from.
  - *Acceptance:* Pasted text and digitally generated PDF are the supported happy path; scanned-image OCR is best-effort.
- **US-3 (M):** As a provider, I get back a structured set of care actions from the AI extraction in under ~10 seconds.
  - *Acceptance:* Each action carries `type`, `title`, `instructions`, `dueDate`, `priority`, `sourceText`; the four action types (MEDICATION, TEST, REFERRAL, FOLLOW_UP) are supported.

### 6.2 Verification (human gate #1)

- **US-4 (M):** As a provider, I see each extracted action as an editable card showing type, instructions, due date, priority, assignee, and the **source sentence** it was extracted from, and I can edit/add/delete before activation.
  - *Acceptance:* No action becomes patient-visible without explicit verification; each action card displays the linked source span.
- **US-5 (M):** As a provider, I press "Activate care journey" once to commit the verified plan to the patient.
  - *Acceptance:* Activation writes an `ActionEvent` (audit-trailed); patient sees the journey on next poll.

### 6.3 Patient journey

- **US-6 (M):** As a patient, my home screen shows the immediate due/pending action as a plain-language sentence — no jargon required.
  - *Acceptance:* The next action is the most prominent element; no medical terminology required to understand it.
- **US-7 (M):** As a patient, I can see the full journey as an ordered timeline with a progress count ("2 of 6 completed").
  - *Acceptance:* All actions listed with status (completed / pending / upcoming / locked); the count matches the visible items.
- **US-8 (S):** As a patient, I can open an action to see instructions, deadline, source, and a completion CTA.

### 6.4 Completion & upload

- **US-9 (M):** As a patient, I can mark an action completed with one or two taps; medication supports Taken / Skipped / Remind / Help (not a full scheduler).
  - *Acceptance:* Status transitions and an `ActionEvent` is logged.
- **US-10 (M):** As a patient, I can upload a report against a TEST action.
  - *Acceptance:* Status transitions to `AWAITING_REVIEW`; patient sees "awaiting provider review."
- **US-11 (S):** As a patient, I can request help (caregiver help, transport, "didn't understand," contact provider). Each option raises a care-gap flag.

### 6.5 Provider review & loop close (human gate #2)

- **US-12 (M):** As a provider, my dashboard surfaces what needs attention in four sections: Requires attention · Awaiting review · Overdue · On track.
  - *Acceptance:* Each section is a deterministic query against the action set; no hidden items.
- **US-13 (M):** As a provider, I can review a report, add a comment, mark reviewed, and optionally spawn a follow-up action.
  - *Acceptance:* On `REVIEWED`, the patient's next action updates; the original action transitions to `CLOSED` only when all three conditions hold.
- **US-14 (M):** An action is `CLOSED` only when it is completed **and** reviewed (if `reviewRequired`) **and** the next step has been communicated.
  - *Acceptance:* Enforced by the state machine (§10); loop-closed state reflected to the patient.

### 6.6 Care-gap detection

- **US-15 (M):** The system surfaces gaps via deterministic rules (overdue, unreviewed report, incomplete referral, patient needs help, medication adherence warning).
  - *Acceptance:* Rules evaluated on read/refresh; flagged items appear on the dashboard; presented as **operational alerts, not medical judgments**.

### 6.7 Stretch goals (C)

- **US-16 (C):** As a patient, I can read/listen to the next action in Malayalam (TTS or localized labels).
- **US-17 (C):** As a patient, I can access my journey via QR (Naadi-platform-style patient lookup, deferred from the platform MVP).
- **US-18 (C):** As a caregiver, I have a lightweight dashboard view of the patient's journey.

---

## 7. Screens & UX Flows

### 7.1 Provider flow

1. **Patient selection** — provider picks a patient from the list, or adds one (name, age, phone, language, caregiver contact).
2. **Document input** — provider pastes text or selects a digital PDF.
3. **Verify care plan** — AI-extracted actions appear as editable cards with linked source sentences; provider edits, deletes, adds, then presses *Activate care journey*.
4. **Dashboard** — Requires attention · Awaiting review · Overdue · On track. Each section is a deterministic query.
5. **Report review** — provider opens a report, reads it, comments, marks reviewed, optionally spawns a follow-up action.

### 7.2 Patient flow

1. **My next action** — one prominent sentence ("Take Tablet A after breakfast today").
2. **My care journey** — ordered timeline with status badges and a progress count.
3. **Action details** — instructions, deadline, source, completion CTA.
4. **Report upload** — pick a file, confirm; transitions to `AWAITING_REVIEW`.
5. **Help request** — caregiver / transport / didn't understand / contact provider.

### 7.3 Coordinator flow

Overdue actions · reports awaiting review · open referrals · patients needing assistance — **served by the same provider account in the MVP** (no separate role this cycle).

### 7.4 Reducing provider workload

The two human gates (verify, review) are non-negotiable (§5), which means the provider's time is the real constraint on how many patients the Loop can carry. The UI is responsible for making each gate fast, not for removing it:

- **Quick-review cards** — each extracted action (verify gate) and each report (review gate) renders as a compact, scannable card, not a form: type, instructions, due date, and source/comment visible without a click-through.
- **Default due dates** — the AI extraction pre-fills a sensible due date per action type so the provider's default motion is *confirm*, not *compute*.
- **One-click approve/edit** — approving an action or a reviewed report is a single action; editing only opens the fields that need to change, not the whole card.
- **Batch review queue** — the dashboard's Awaiting Review section supports reviewing multiple reports in one pass rather than one modal at a time.
- **Coordinator mode** — the same provider account (§7.3) can switch into a coordinator-focused view: overdue actions, open reports, and incomplete referrals surfaced first, ahead of new extractions, so triage-style work doesn't get buried under plan creation.

None of this weakens the gate — it only removes friction between "the provider decided" and "the system recorded it."

---

## 8. Business Logic & Rules

### 8.1 Care-gap rules (deterministic — no prediction)

| ID | Rule | Condition |
|---|---|---|
| CG-1 | Overdue action | `dueDate` passed AND `status` ≠ `COMPLETED`/`CLOSED` |
| CG-2 | Unreviewed report | Report uploaded AND `status` = `AWAITING_REVIEW` |
| CG-3 | Incomplete referral | Referral `ISSUED` but not `ATTENDED` before due date |
| CG-4 | Patient needs support | Patient selected "Need help" |
| CG-5 | Medication adherence warning | Two consecutive doses unconfirmed |

These rules are evaluated on every read/refresh. They are **operational alerts, not medical judgments** — the wording must reflect that.

### 8.2 Verification guarantees

| Concern | Rule |
|---|---|
| Who can activate a plan | Only the verified provider for the patient; activation writes an `ActionEvent` |
| What becomes patient-visible | Only actions whose `verified = true` AND whose parent `CarePlan.status` is `activated` |
| Source traceability | Every action's `sourceText` must map to a span in the source document |
| Loop closure | `status = CLOSED` only when `completed` AND `reviewed` (if `reviewRequired`) AND next step communicated |

### 8.3 Audit-trail invariants

1. Every status transition writes an `ActionEvent` row in the same procedure. `Verify`, `Activate`, `Complete`, `Upload`, `Review`, `Close`, `Spawn follow-up` are all events.
2. A state change that is not event-logged is a bug, not an optimization.
3. The event log is the source of truth for loop-closure metrics (§2.3).

### 8.4 Notification model (demo-scoped)

Patient-facing "next action updated" and "help request raised" notifications are delivered via short-interval polling (every 3s) rather than push/websockets. This is stated explicitly as a demo shortcut, not a designed limitation.

---

## 9. AI Requirements & Guardrails

**Single task:** convert medical instructions into structured care actions. Nothing else.

### 9.1 Structured output contract

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

### 9.2 Guardrails

- **Low temperature, strict JSON output, one retry on parse failure.** Anything beyond one retry is a system defect, not a degradation.
- **Every `sourceText` maps to a span in the input.** Traceability = trust; the provider must be able to verify the extraction by reading the source sentence.
- **The provider-verification gate (US-4 / US-5) is the primary safeguard.** The AI proposes, the human disposes. Nothing auto-activates.
- **Never claim** diagnosis, lab interpretation, medication recommendation, deterioration prediction, or autonomous urgency scoring. These behaviors are absent from the build and absent from the pitch.

---

## 10. Data Model & State Machine

PostgreSQL via Drizzle ORM. Six entities. The schema is intentionally small — fast to implement, easy to defend.

```ts
// packages/db/src/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core";

export const actionType = pgEnum("action_type", [
  "MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP",
]);
export const actionStatus = pgEnum("action_status", [
  "PENDING", "DUE", "COMPLETED", "AWAITING_REVIEW", "REVIEWED", "CLOSED",
]);
export const carePlanStatus = pgEnum("care_plan_status", [
  "draft", "verified", "activated", "archived",
]);
export const eventType = pgEnum("event_type", [
  "EXTRACTED", "VERIFIED", "ACTIVATED", "COMPLETED", "SKIPPED",
  "REMINDED", "HELP_REQUESTED", "REPORT_UPLOADED", "REVIEWED",
  "FOLLOW_UP_SPAWNED", "CLOSED",
]);

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  age: text("age"),
  phone: text("phone"),
  language: text("language").default("en"),
  caregiverContact: jsonb("caregiver_contact").$type<{ name?: string; phone?: string }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sourceDocuments = pgTable("source_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  documentType: text("document_type").notNull(),   // "discharge_summary" | "prescription" | "referral"
  content: text("content").notNull(),               // pasted text or PDF-extracted text
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const carePlans = pgTable("care_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientId: uuid("patient_id").references(() => patients.id).notNull(),
  providerId: uuid("provider_id").notNull(),         // simplified to a uuid for the MVP; maps to a seeded user
  status: carePlanStatus("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

export const careActions = pgTable("care_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  carePlanId: uuid("care_plan_id").references(() => carePlans.id).notNull(),
  type: actionType("type").notNull(),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  dueDate: timestamp("due_date"),
  status: actionStatus("status").default("PENDING").notNull(),
  priority: text("priority").default("NORMAL"),      // "NORMAL" | "HIGH"
  sourceText: text("source_text").notNull(),        // provenance: snippet from the source document
  assignedTo: text("assigned_to").default("patient"),
  reviewRequired: boolean("review_required").default(false),
  verified: boolean("verified").default(false),     // human gate #1
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  careActionId: uuid("care_action_id").references(() => careActions.id).notNull(),
  fileUrl: text("file_url").notNull(),              // mock file URL acceptable for the MVP
  status: text("status").default("AWAITING_REVIEW").notNull(),  // "AWAITING_REVIEW" | "REVIEWED"
  providerComment: text("provider_comment"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const actionEvents = pgTable("action_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  careActionId: uuid("care_action_id").references(() => careActions.id).notNull(),
  eventType: eventType("event_type").notNull(),
  createdBy: text("created_by").notNull(),          // "provider" | "patient" | "system"
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
```

### 10.1 Unified status model

One state machine for all actions. `reviewRequired` (true for `TEST` and outcome-bearing `REFERRAL`) decides whether the review states apply. `OVERDUE` is a **derived flag** (`dueDate` passed, not yet completed), not a separate lifecycle branch.

```text
PENDING → DUE → COMPLETED → [AWAITING_REVIEW → REVIEWED] → CLOSED
                      └───────────── (if reviewRequired = false) ──────────→ CLOSED
                (OVERDUE = derived when DUE date passes without completion)
```

Referral stages map onto the same model rather than a parallel one:

| Referral stage | Maps to |
|---|---|
| `ISSUED` | `PENDING` |
| `ACCEPTED` | `DUE` |
| `ATTENDED` | `COMPLETED` |
| `OUTCOME_RETURNED` | `AWAITING_REVIEW` → `REVIEWED` |
| `CLOSED` | `CLOSED` |

This is the refinement: **one status enum, one set of transitions, referral as a mapping** — faster to implement and easier to explain than two models.

---

## 11. API Contract (tRPC)

This contract should be agreed and frozen in the **first 30 minutes** of the build — it is what lets four people build in parallel without collisions, since the frontend can code against these types before the server implementation exists.

```ts
// packages/api/src/router.ts — signatures only
export const appRouter = router({
  auth: router({
    login:        publicProcedure.input(z.object({ email: z.string() })).mutation(...), // seeded, returns {user, role}
    me:           protectedProcedure.query(...),
  }),

  patient: router({
    list:                protectedProcedure.query(...),
    create:              protectedProcedure.input(z.object({
      name: z.string(), age: z.string().optional(),
      phone: z.string().optional(), language: z.string().optional(),
      caregiverContact: z.object({ name: z.string().optional(), phone: z.string().optional() }).optional(),
    })).mutation(...),
    getNextAction:       protectedProcedure.input(z.object({ patientId: z.string() })).query(...),
    getJourney:          protectedProcedure.input(z.object({ patientId: z.string() })).query(...),
    completeAction:      protectedProcedure.input(z.object({ actionId: z.string(), outcome: z.string() })).mutation(...), // outcome: taken | skipped | reminded | help
    uploadReport:        protectedProcedure.input(z.object({ actionId: z.string(), fileUrl: z.string() })).mutation(...),
    requestHelp:         protectedProcedure.input(z.object({ actionId: z.string(), kind: z.string() })).mutation(...),
  }),

  provider: router({
    listPatients:        protectedProcedure.query(...),
    uploadDocument:      protectedProcedure.input(z.object({
      patientId: z.string(), documentType: z.string(), content: z.string(),
    })).mutation(...),
    extractActions:      protectedProcedure.input(z.object({ documentId: z.string() })).mutation(...), // AI extraction
    saveCarePlan:        protectedProcedure.input(z.object({
      documentId: z.string(),
      actions: z.array(z.object({
        type: z.string(), title: z.string(), instructions: z.string(),
        dueDate: z.string().optional(), priority: z.string().optional(),
        sourceText: z.string(), reviewRequired: z.boolean().optional(),
      })),
    })).mutation(...),
    activateCarePlan:    protectedProcedure.input(z.object({ carePlanId: z.string() })).mutation(...),
    dashboard:           protectedProcedure.query(...),                  // 4 sections: needs attention / awaiting review / overdue / on track
    reviewReport:        protectedProcedure.input(z.object({
      reportId: z.string(), comment: z.string().optional(),
      spawnFollowUp: z.object({ title: z.string(), instructions: z.string(), dueDate: z.string().optional() }).optional(),
    })).mutation(...),
  }),
});
```

**Two rules that make it credible** (restated from §8.3 — enforced in the procedures, not the UI):

1. Every status transition writes an `action_events` row in the same procedure call. `Verified`, `Activated`, `Completed`, `Report uploaded`, `Reviewed`, `Closed` are all events.
2. A state change that is not event-logged is a bug, not an optimization. The event log is the source of truth for loop-closure metrics.

> **Platform note (deferred):** in the long-term Naadi platform, `provider.*` procedures carrying writes to a patient record will be guarded by an `approved`, unexpired consent row (§1 platform positioning). The MVP runs in a single institution and so does not enforce that guard — but the procedures are designed so the guard can be added without changing the call sites.

---

## 12. Technical Architecture

### 12.1 Stack

| Layer | Choice | Why it fits a 4-hour, type-safe build |
|---|---|---|
| Frontend | React + **Vite** | Instant HMR, zero-config speed |
| Routing | **TanStack Router** | Type-safe routes; file/loader model pairs well with tRPC |
| Styling | **Tailwind CSS v4** | CSS-first `@theme`, no config file to babysit |
| Components | **shadcn/ui + Radix** | Accessible primitives, copy-in speed, on-brand fast |
| API contract | **tRPC** (shared router pkg) | End-to-end types, no schema drift between FE/BE |
| Server | **Hono on Node** + tRPC adapter | Tiny, fast, first-class tRPC fetch adapter |
| AI | OpenAI/Anthropic chat completion with strict JSON output | One job: instruction → structured actions (§9) |
| DB | **PostgreSQL on Neon** | Serverless, branch-per-dev, instant provisioning |
| ORM | **Drizzle** | Type-safe SQL, migrations in seconds, matches the tRPC type story |
| Analytics | **Recharts** | Drop-in charts for the loop-closure / status viz |
| Monorepo | **pnpm workspaces** | Shared `api`/`db` packages, one install |
| Lint/format | **Biome** | One tool, near-zero config, no ESLint+Prettier setup tax |

### 12.2 Monorepo layout

```
naadi/
├── apps/
│   ├── web/                 # React + Vite + TanStack Router + Tailwind v4 + tRPC client
│   │   └── src/
│   │       ├── routes/      # TanStack Router routes
│   │       ├── components/
│   │       │   └── ui/      # shadcn/ui primitives
│   │       ├── lib/trpc.ts  # tRPC client
│   │       └── app.css      # Tailwind v4 @theme (brand tokens)
│   └── server/              # Hono + tRPC fetch adapter (Node)
│       └── src/index.ts
├── packages/
│   ├── api/                 # tRPC root router + procedures (SHARED)
│   │   └── src/router.ts
│   ├── db/                  # Drizzle schema + Neon client + seed
│   │   ├── src/schema.ts
│   │   └── src/seed.ts
│   └── ai/                  # structured-extraction helper (SHARED)
│       └── src/extract.ts
├── pnpm-workspace.yaml
├── biome.json
└── package.json
```

> **4-hour pragmatism:** shadcn components live inside `apps/web/src/components/ui` (standard location) rather than a `packages/ui` build target — a shared UI package's config overhead isn't worth it under time pressure. "Shared UI" here means *consistent use of shadcn/Radix primitives*; the genuinely shared code lives in `packages/api`, `packages/db`, and `packages/ai`.

### 12.3 Data flow

```
Provider UI ─┐
             │  tRPC client (typed)
Patient UI ──┼──────────────► Hono server ───────┐  tRPC router (packages/api)
             │                (tRPC adapter)      │
AI extract ──┘                     │             │  action_events write on every
                                   ▼             │  status transition
                           Drizzle ──► Neon Postgres
```

Every state change — verify, activate, complete, upload, review, close — writes an `action_events` row *inside the same procedure*. State and its record are inseparable by design, not by convention.

### 12.4 Deployment

- **Web:** Vercel (Vite static build) or Netlify.
- **Server:** Render / Railway / Fly (Node + Hono), or as a serverless function alongside the web deploy.
- **DB:** Neon (serverless). One branch per dev during the build to avoid stepping on shared data.
- **AI:** API key in the server env. No client-side AI calls.

---

## 13. Branding & Design System

### 13.1 Name & voice

**Naadi Loop** — *No patient lost between prescription and recovery.* The "Loop" qualifier names the current MVP; the broader Naadi platform is the long-term north star.

**Voice:** Calm, plain-language, patient-first. Never "your care task #4471" — instead "Take Tablet A after breakfast today." Every status badge, every dashboard label, every help-screen prompt must read as a sentence a nervous patient would understand.

### 13.2 Visual motif

The Loop's visual hook is the **closed loop** — a circular progress indicator on the patient home (actions completed / total) and a flow diagram on the provider dashboard. The Naadi pulse line (one continuous stroke resolving into a node) remains the wordmark; the loop is the active product metaphor.

### 13.3 Color tokens

Trust-forward teal as the brand core, warm amber for secondary actions, and a **human-gate accent** reserved for the two verification steps (extract-verify, report-review), so the moments where the human decides are visually unmistakable.

| Token | Hex | Use |
|---|---|---|
| `primary` | `#0F766E` | Brand, primary buttons, links, default timeline |
| `primary-ink` | `#0B3A34` | Headings, high-contrast text on light |
| `accent` | `#F59E0B` | Secondary CTAs, "Activate care journey" |
| `gate` | `#7C3AED` | **Human gates (verify, review) ONLY — never decorative** |
| `success` | `#10B981` | Loop closed, action completed |
| `warning` | `#EA580C` | Overdue, needs attention |
| `bg` | `#FAFAF9` | App background (warm off-white) |
| `surface` | `#FFFFFF` | Cards, panels |
| `text` | `#1C1917` | Body text |
| `muted` | `#78716C` | Secondary text, timestamps |

**Tailwind v4 `@theme` (CSS-first config, in `app.css`):**

```css
@import "tailwindcss";

@theme {
  --color-primary: #0F766E;
  --color-primary-ink: #0B3A34;
  --color-accent: #F59E0B;
  --color-gate: #7C3AED;
  --color-success: #10B981;
  --color-warning: #EA580C;
  --color-bg: #FAFAF9;
  --color-surface: #FFFFFF;
  --color-muted: #78716C;

  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Fraunces", "Inter", serif;

  --radius: 0.75rem;
}
```

### 13.4 Typography

- **Body/UI:** Inter.
- **Wordmark / hero headline (optional):** Fraunces — warm humanist serif signaling "care, not clinical coldness." Reserved for logo/hero only, to avoid slowing the build.

---

## 14. Edge Cases & Error Handling (in scope)

| Case | Required behavior |
|---|---|
| AI extraction fails (parse error after one retry) | Surface a clear error to the provider; do not silently degrade; offer to retry or to paste manually |
| Patient tries to mark an action completed before it's `DUE` | Allow but log an `ActionEvent` with `SKIPPED` semantics if the action is past `dueDate`; otherwise treat as `COMPLETED` |
| Patient uploads a report against a non-`TEST` action | Procedure rejects with a clear error |
| Provider activates a plan with some actions still `verified = false` | Reject; activation requires every action verified (the gate is non-negotiable) |
| `dueDate` has passed on a `PENDING` action | Derived `OVERDUE = true`; appears in the dashboard's Overdue section on next refresh |
| Report uploaded with no provider comment | Allowed; comment is optional, but the review transition still requires an explicit `Reviewed` action |
| Patient requests help without a current action | Allowed; the `HELP_REQUESTED` event is recorded with `actionId = null` and surfaces on the dashboard |

Explicitly **not** hardened in this build (roadmap): concurrent-write race conditions on action status, malformed/oversized JSON on `actions`, rate limiting on `extractActions`, large-language-model cost ceilings.

---

## 15. Non-Functional Requirements

- **Type safety end-to-end:** tRPC + Drizzle + Zod mean no hand-maintained API schema; a change to `packages/db`'s schema or `packages/api`'s router should surface as a type error in `apps/web`, not a runtime surprise.
- **No silent state changes:** restated from §8.3 rule 1 because it is the single most important non-functional property of this system — every status transition must produce an `action_events` row synchronously.
- **No auto-activation:** restated from §9.2 because the AI guardrail is the second most important non-functional property — nothing AI-extracted becomes patient-visible without a verified, activated care plan.
- **Responsive:** demo must work on a laptop screen and a phone screen (the patient home in particular is a phone-first scenario — someone opening their next action after a clinic visit).
- **Accessibility (baseline only):** shadcn/Radix primitives are used as-is for their built-in keyboard/ARIA behavior; no additional a11y audit is in scope for the 4-hour build.
- **Performance:** AI extraction < ~10s; all other interactions feel instant on seeded data. No load testing, no specific latency budget beyond what's needed for the demo.

---

## 16. Team Plan — 4 devs × 4 hours

Contract-first (§11) unlocks parallelism. AI coding agents (Claude Code / Cursor) act as force-multipliers per person; pair one agent-driver with the schema owner early so shared types land fast.

| Dev | Owns | Deliverables |
|---|---|---|
| **D1 — Backend & workflow** | `packages/db`, `packages/api`, `apps/server` | Monorepo scaffold, Neon, Drizzle schema + migrations + **seed**, Hono+tRPC server, all procedures, state-machine transitions, care-gap rules, event writes |
| **D2 — FE infra + auth** | `apps/web` shell | Vite + TanStack Router + Tailwind v4 `@theme` + shadcn, tRPC client, role/auth context, layout, nav |
| **D3 — Patient experience** | Patient screens | Home (next action), journey timeline, action details, report upload, help request |
| **D4 — Provider + AI + polish** | Provider screens, AI extraction, dashboard, viz | Patient selection, document input, verify cards, **AI extraction wiring**, dashboard (4 sections), report review, Recharts panel, demo seeding, rehearsal |

### 16.1 Hour-by-hour timeline

| Time | Focus | Gate |
|---|---|---|
| **0:00–0:30** | Scaffold monorepo, Neon DB, deploy targets, Biome. **Lock the tRPC contract (§11) + schema (§10) + state machine (§10.1).** | Everyone can `pnpm dev`; types shared |
| **0:30–1:30** | Parallel build. D1: procedures + seed. D2: shell/auth/routing. D3: patient screens vs. stubbed types. D4: provider + AI extraction. | Each surface renders with mock data |
| **1:30–2:30** | Integration. Swap stubs for real tRPC. **Document → extraction → verification → patient journey end-to-end.** | Mandatory milestone #1 works on real data |
| **2:30–3:15** | Complete the loop: patient completion · report upload · provider review · dashboard alerts. | Demo beats 1–4 work on real data |
| **3:15–4:00** | **Freeze features.** Seed failure scenarios, polish, rehearse the script twice, fix only demo-path bugs, deploy, prep pitch. | Clean <3-min run-through, deployed URL |

### 16.2 Team split (mirrors the build order)

- **M1 patient experience** — D3
- **M2 provider experience** — D4
- **M3 backend & workflow** — D1 (schema, status transitions, care-gap detection, seed)
- **M4 AI & integration** — D4 (extraction, sample docs, dashboard, demo prep)

---

## 17. Priority / Cut List

If behind schedule at the 2:30 mark, cut from the bottom up — the demo survives all of these:

1. Malayalam TTS / labels → cut.
2. Caregiver dashboard → cut.
3. Browser notifications → cut (polling is enough on stage).
4. QR patient access → cut (platform MVP, not the Loop MVP).
5. ABDM-style consent simulation → cut (platform MVP, not the Loop MVP).

**Never cut:** the AI extraction (US-3), the provider verification gate (US-4 / US-5), the patient journey (US-6 / US-7), the report upload + provider review (US-10 / US-13), the dashboard (US-12), and the loop-closure transition (US-14). Without those, the product is not a product.

---

## 18. Demo Script (~3 minutes)

Seed two patients and one provider so nothing is typed live except the two "wow" moments (paste document, comment on review).

1. **Document → pathway.** Provider selects the demo patient, pastes a discharge summary, clicks *Generate care journey*. Four actions (MEDICATION, TEST, REFERRAL, FOLLOW_UP) appear instantly. *"This isn't a PDF in a folder — it's a structured plan."*
2. **Verification (human gate #1).** Show each action's link to its source sentence; correct one due date; press *Activate care journey*. *"The AI proposes. The human disposes. Nothing auto-activates."*
3. **Patient journey.** Switch to patient. Home shows *"Complete CBC test tomorrow."* Open the journey — *"2 of 6 completed."* Mark the test done; upload a sample report. *"No patient lost between prescription and recovery."*
4. **Care-gap detection.** Switch to provider dashboard. Show the CBC report awaiting review, plus a seeded overdue referral. *"Deterministic gaps, not AI predictions — operational alerts, not medical judgments."*
5. **Close the loop (human gate #2).** Open the report, comment *"Reviewed. Continue medication and attend cardiology consultation,"* mark reviewed, spawn the follow-up. Switch back to patient and show the updated next action. *"Loop closed when instruction → completion → review → next step all landed."*

Close on: *"ABDM makes records portable. Naadi Loop makes care complete."*

---

## 19. Risks & Assumptions

| Risk | Impact | Mitigation |
|---|---|---|
| Live AI extraction flakes or hallucinates on stage | Live demo stalls mid-script | Low-temp strict-JSON prompt + one retry; **pre-seed a verified example**; keep a recorded fallback; the verify gate means nothing wrong ever reaches the patient — turn this into the pitch |
| Scope creep past 4 hours (consent, audit, cross-provider access) | The Loop story is diluted; build invisible | Non-Goals list (§3) is a contract; hard feature-freeze at 3:15; let the platform story live in §1 and §17, not in the MVP |
| Two status models create bugs (referral vs. action) | Confusing state for the demo | Unified state machine (§10.1); referral mapped, not duplicated |
| Scanned-image OCR unreliable | Demo stalls on a noisy input | Constrain demo input to pasted text / digital PDF (§8.2) |
| Role-switch confusion mid-demo | Loses the narrative | Seed two logins or a visible role toggle; rehearse the switch |
| Report storage not ready | Review flow blocked | Accept a mock `fileUrl`; review flow doesn't depend on real bytes |
| Concurrent provider edits on the same plan | Status drift | Out of scope (§14); the demo is single-provider |

**Assumptions:** judges are evaluating the *process* (instruction → completion → review → loop close) more than visual polish; a single provider and two seeded patients are sufficient to tell the full story; no real PHI is used (all seed data is fictional); the broader Naadi platform's consent/audit model is acknowledged but not built.

---

## 20. Open Questions (roadmap)

Platform / scope questions deferred from the MVP:

- **Consent & audit.** When does the broader Naadi platform's patient-issued, time-boxed consent model come back in? The current `provider.*` procedures are designed so the guard can be added without changing call sites (§11 platform note).
- **Sensitive-category gating.** How would a gate for mental health, reproductive health, or HIV-related care instructions be modeled — a flag on `careActions`? A separate `scope` on the platform's `consents`?
- **Cross-provider handoff.** When a referral actually leaves the institution, how does the receiving provider enter the outcome — a federated identity, a `referral_outcomes` table linked to an external provider id, or a clinic-to-clinic handoff API?
- **AI beyond extraction.** What does a future "draft a follow-up SMS based on this care plan" feature look like, and how does it stay inside the human gate?
- **Notifications.** What is the real notification transport post-hackathon (push vs. SMS vs. WhatsApp), and does that change the audit-log / notification coupling?
- **Caregiver delegation.** What does a real caregiver dashboard look like in production — a separate role, a delegated patient view, or a "support contact" model on the patient?
- **Coordinator role divergence.** Where does the coordinator role diverge from the provider role in production — a separate view, a separate permission set, or a separate queue?

---

## 21. Glossary

- **Care action** — a single trackable instruction (medicine, test, referral, follow-up).
- **Care plan** — the provider-verified set of actions generated from one document.
- **Loop closure** — an action reaching `CLOSED`: completed, reviewed (if `reviewRequired`), and next step communicated.
- **Care gap** — a deterministically detected break in the journey (overdue, unreviewed, etc.).
- **Human gate** — a mandatory provider checkpoint (verification, review) that AI cannot bypass.
- **Verified** — the per-action flag set by the provider after editing the AI extraction; required before activation.
- **Activated** — the `carePlan.status` that releases the verified actions to the patient view.
- **`OVERDUE`** — a derived flag (due date passed, not yet completed), not a separate lifecycle branch.
- **Source text** — the snippet of the original document an action was extracted from; the traceability link the provider clicks to verify the AI.

---

*Design principle to hold the line on: Naadi Loop tracks a process, not a document. If a decision doesn't help an instruction travel from issued → completed → reviewed, it's out of scope for this cycle.*
