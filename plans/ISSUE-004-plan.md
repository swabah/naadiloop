# Plan — ISSUE-004: Document Input & AI Extraction

## 1. Goal

Turn unstructured medical instructions into a persisted, provider-only draft Care plan without
clinical interpretation. Providers can paste text or extract text from a digital PDF, then review
strictly structured Care actions whose provenance is traceable to the submitted document.

## 2. Interface first

The existing `sourceDocuments`, `carePlans`, and `careActions` tables remain the persistence
boundary; no schema migration is required.

The frozen tRPC procedures receive these implementations:

```ts
document.create(DocumentInput) -> SourceDocument
document.extract({ documentId }) -> {
  document: SourceDocument
  patient: Patient
  carePlan: CarePlan
  actions: CareAction[]
}
```

- Both procedures require the Provider demo role.
- `document.create` validates that the Patient exists before saving source text.
- `document.extract` loads the persisted document, calls the server-only extraction module, checks
  every source quote against the document, and persists only a draft Care plan and unverified
  actions.
- Extraction output requires `type`, `title`, `instructions`, `dueDate`, `priority`, and
  `sourceText`. The helper accepts only the four existing action types.

`packages/ai` exposes:

```ts
extractCareActions({
  sourceText,
  now?,
  request?,
  apiKey?,
  model?,
}) -> Promise<ExtractedCareAction[]>
```

The request seam is injectable so strict parsing, provenance rejection, and the one-retry ceiling
can be verified without live model access. The default implementation calls OpenAI from the server
with temperature zero and strict JSON Schema output.

The web PDF helper exposes:

```ts
extractDigitalPdfText(file: File) -> Promise<string>
```

It returns embedded text only and rejects empty/scanned documents with plain guidance.

## 3. Implementation steps

1. Add the `@naadi/ai` workspace package with the strict extraction schema, prompt, server-only API
   client, provenance validation, and a maximum of one retry.
2. Extend API schemas with a required-field extraction shape and a shared extraction-result shape.
3. Implement Provider-only document creation and extraction; create draft Care plans and
   unverified actions only after validated output is available.
4. Add PDF.js to the web package and isolate digital-PDF embedded-text extraction in a utility.
5. Replace the document placeholder with Patient context, input type controls, paste/PDF flows,
   extraction progress, retry, failure, and manual-entry affordances.
6. Hand the validated extraction result to the verification route via provider-session storage and
   a typed Care plan identifier in the URL; render a read-only handoff summary until ISSUE-005 adds
   editing and activation.
7. Document server-only OpenAI environment configuration without adding credentials.
8. Verify extraction logic, monorepo types, formatting, build output, and the issue acceptance
   criteria before moving the issue records to `done/`.

## 4. Verification

- Unit tests prove all four Care action types parse, missing required fields fail, untraceable
  quotes fail, and invalid output causes exactly one retry.
- `pnpm check`, `pnpm typecheck`, and `pnpm build` pass.
- A pasted reference discharge summary creates a persisted Source Document and a four-action draft
  when a live API key is available.
- A digital PDF with embedded text can populate the source editor; an image-only/scanned PDF shows
  best-effort guidance instead of pretending OCR succeeded.
- Provider UI shows progress, retry, and manual-entry paths; no failure path creates or activates a
  Care plan.
- Successful extraction navigates to the selected Patient's verification route with document,
  Patient, Care plan, and action context.
- The browser bundle contains no AI credential or AI request.

## 5. Risks and decisions

- Live model availability is an external dependency. This issue reports live failure honestly;
  ISSUE-012 owns the explicitly labelled demo fallback.
- PDF support deliberately reads embedded digital text only. OCR remains best-effort guidance and
  is not added to the critical path.
- `priority` is extraction-only: it remains `NORMAL` unless the document explicitly labels an
  instruction urgent. The model is prohibited from inferring urgency or making clinical judgments.
- The verification handoff is session-scoped because ISSUE-005 owns the durable draft editing/read
  interface. Database rows remain the source of truth for the later activation flow.
