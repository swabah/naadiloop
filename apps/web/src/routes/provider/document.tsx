import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  FileText,
  FileUp,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { extractDigitalPdfText } from "../../lib/pdf-text";
import { trpc } from "../../lib/trpc";

type DocumentType = "discharge_summary" | "prescription" | "referral" | "lab_form" | "other";
type InputMode = "paste" | "pdf";
type Progress = "idle" | "reading-pdf" | "saving" | "extracting" | "failed";

const documentTypeLabels: Record<DocumentType, string> = {
  discharge_summary: "Discharge summary",
  prescription: "Prescription",
  referral: "Referral",
  lab_form: "Lab form",
  other: "Other instructions",
};

export function ProviderDocumentPage() {
  const { patientId } = useParams({ from: "/provider/patients/$patientId/document" });
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const patientsQuery = trpc.patient.list.useQuery();
  const createDocument = trpc.document.create.useMutation();
  const extractDocument = trpc.document.extract.useMutation();
  const createManualDraft = trpc.carePlan.createManualDraft.useMutation();
  const [mode, setMode] = useState<InputMode>("paste");
  const [documentType, setDocumentType] = useState<DocumentType>("discharge_summary");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);

  const patient = patientsQuery.data?.find((candidate) => candidate.id === patientId);
  const busy = progress === "reading-pdf" || progress === "saving" || progress === "extracting";

  const runExtraction = async (documentId: string) => {
    setProgress("extracting");
    setError(null);
    try {
      const result = await extractDocument.mutateAsync({ documentId });
      await navigate({
        to: "/provider/patients/$patientId/verify",
        params: { patientId },
        search: { carePlanId: result.carePlan.id, manual: false },
      });
    } catch (mutationError) {
      setProgress("failed");
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Extraction failed. Retry or continue with manual entry.",
      );
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim()) {
      setError("Paste instructions or choose a digital PDF first.");
      return;
    }

    setProgress("saving");
    setError(null);
    try {
      const document = await createDocument.mutateAsync({
        patientId,
        type: documentType,
        content,
      });
      setSavedDocumentId(document.id);
      await runExtraction(document.id);
    } catch (mutationError) {
      setProgress("failed");
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "The medical instructions could not be saved.",
      );
    }
  };

  const choosePdf = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProgress("reading-pdf");
    setError(null);
    setFileName(file.name);
    setSavedDocumentId(null);
    try {
      setContent(await extractDigitalPdfText(file));
      setProgress("idle");
    } catch (pdfError) {
      setContent("");
      setProgress("failed");
      setError(pdfError instanceof Error ? pdfError.message : "The PDF could not be read.");
    } finally {
      event.target.value = "";
    }
  };

  const continueManually = async () => {
    if (!savedDocumentId) return;
    setError(null);
    try {
      const result = await createManualDraft.mutateAsync({ documentId: savedDocumentId });
      await navigate({
        to: "/provider/patients/$patientId/verify",
        params: { patientId },
        search: { carePlanId: result.carePlanId, manual: true },
      });
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Manual draft could not be opened.",
      );
    }
  };

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <Badge variant="info">Provider workspace · Extraction only</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
            Add medical instructions
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            {patient
              ? `Create a draft Care plan for ${patient.name}.`
              : "Create a draft Care plan for the selected Patient."}{" "}
            Nothing becomes Patient-visible until a Provider verifies and activates it.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/provider/patients" })}
          disabled={busy}
        >
          <ArrowLeft className="size-4" />
          Change Patient
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
        <Card className="p-5 sm:p-7">
          <form className="space-y-6" onSubmit={submit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold" htmlFor="document-type">
                Document type
              </label>
              <Select
                value={documentType}
                onValueChange={(value: DocumentType) => setDocumentType(value)}
                disabled={busy}
              >
                <SelectTrigger id="document-type" aria-label="Document type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(Object.entries(documentTypeLabels) as Array<[DocumentType, string]>).map(
                    ([value, label]) => (
                      <SelectItem value={value} key={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-primary-soft/60 p-1.5">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  mode === "paste" ? "bg-white text-primary-ink shadow-sm" : "text-muted"
                }`}
                onClick={() => setMode("paste")}
                disabled={busy}
              >
                <ClipboardPaste className="size-4" />
                Paste text
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  mode === "pdf" ? "bg-white text-primary-ink shadow-sm" : "text-muted"
                }`}
                onClick={() => setMode("pdf")}
                disabled={busy}
              >
                <FileUp className="size-4" />
                Digital PDF
              </button>
            </div>

            {mode === "pdf" ? (
              <div className="rounded-2xl border border-dashed border-primary/35 bg-primary-soft/25 p-6 text-center">
                <input
                  ref={fileInput}
                  className="sr-only"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={choosePdf}
                  aria-label="Choose digital PDF"
                />
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-primary shadow-sm">
                  {progress === "reading-pdf" ? (
                    <LoaderCircle className="size-5 animate-spin" />
                  ) : (
                    <FileText className="size-5" />
                  )}
                </div>
                <p className="mt-3 text-sm font-bold text-primary-ink">
                  {fileName ?? "Choose a digital PDF"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Embedded text is extracted in your browser. Scanned files are best-effort and may
                  need pasted text instead.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInput.current?.click()}
                  disabled={busy}
                >
                  <FileUp className="size-4" />
                  {fileName ? "Choose another PDF" : "Browse PDF"}
                </Button>
              </div>
            ) : null}

            <label className="block space-y-2" htmlFor="document-content">
              <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                Source text
                <span className="text-xs font-normal text-muted">{content.length}/100,000</span>
              </span>
              <Textarea
                id="document-content"
                className="min-h-64 leading-6"
                value={content}
                onChange={(event) => {
                  setContent(event.target.value);
                  setSavedDocumentId(null);
                  setError(null);
                  setProgress("idle");
                }}
                placeholder="Paste the medical instructions exactly as provided…"
                maxLength={100_000}
                disabled={busy}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setContent(
                    "Take Amlodipine 5 mg once daily after breakfast. Complete a CBC blood test tomorrow. Attend a cardiology consultation within three days. Return to the PHC for follow-up in seven days.",
                  );
                  setSavedDocumentId(null);
                  setError(null);
                  setProgress("idle");
                }}
                disabled={busy}
              >
                Load fictional four-action sample
              </Button>
            </label>

            {progress === "saving" || progress === "extracting" ? (
              <div
                className="flex items-start gap-3 rounded-2xl bg-primary-soft px-4 py-4"
                role="status"
              >
                <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
                <div>
                  <p className="text-sm font-bold text-primary-ink">
                    {progress === "saving"
                      ? "Saving the source document…"
                      : "Extracting draft Care actions…"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    The AI is extracting only. A Provider must verify every action before
                    activation.
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <div
                className="flex items-start gap-3 rounded-2xl bg-warning/10 px-4 py-4 text-warning"
                role="alert"
              >
                <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">Draft actions could not be prepared</p>
                  <p className="mt-1 text-xs leading-5">{error}</p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              {progress === "failed" && savedDocumentId ? (
                <Button
                  type="button"
                  className="sm:flex-1"
                  onClick={() => runExtraction(savedDocumentId)}
                >
                  <RefreshCw className="size-4" />
                  Retry extraction
                </Button>
              ) : (
                <Button type="submit" className="sm:flex-1" disabled={busy || !content.trim()}>
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  Save and extract
                  {!busy ? <ArrowRight className="size-4" /> : null}
                </Button>
              )}
              {progress === "failed" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void continueManually()}
                  disabled={!savedDocumentId || createManualDraft.isPending}
                >
                  Continue with manual entry
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-success/10 text-success-ink">
                <CheckCircle2 className="size-5" />
              </div>
              <h2 className="font-bold text-primary-ink">Supported inputs</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>• Pasted medical instruction text</li>
              <li>• Digitally generated PDFs with embedded text</li>
              <li>• Scanned PDFs only when text can be extracted; OCR is not guaranteed</li>
            </ul>
          </Card>

          <Card className="border-gate/15 p-5">
            <Badge variant="gate">Human gate</Badge>
            <h2 className="mt-3 font-bold text-primary-ink">Extraction is never activation</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              The next screen keeps all actions in draft. Review source quotes, dates, and
              instructions before anything is shown to the Patient.
            </p>
          </Card>
        </aside>
      </div>
    </section>
  );
}
