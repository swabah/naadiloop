import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, ClipboardPen, Quote, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { loadExtractionHandoff } from "../../lib/extraction-handoff";

const actionLabels = {
  MEDICATION: "Medication",
  TEST: "Test",
  REFERRAL: "Referral",
  FOLLOW_UP: "Follow-up",
} as const;

export function ProviderVerifyPage() {
  const { patientId } = useParams({ from: "/provider/patients/$patientId/verify" });
  const { carePlanId, manual } = useSearch({ from: "/provider/patients/$patientId/verify" });
  const navigate = useNavigate();
  const result = useMemo(
    () => (carePlanId ? loadExtractionHandoff(carePlanId) : null),
    [carePlanId],
  );

  if (manual) {
    return (
      <Card className="mx-auto max-w-2xl p-7 text-center sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gate/10 text-gate">
          <ClipboardPen className="size-6" />
        </div>
        <Badge variant="gate" className="mt-5">
          Human gate
        </Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink">Manual Care action entry</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The extraction failure created no Care plan. Manual action editing and activation arrive
          in ISSUE-005; return to the source document now to preserve this safety boundary.
        </p>
        <Button
          className="mt-6"
          onClick={() =>
            navigate({
              to: "/provider/patients/$patientId/document",
              params: { patientId },
            })
          }
        >
          <ArrowLeft className="size-4" />
          Return to source document
        </Button>
      </Card>
    );
  }

  if (!result || result.patient.id !== patientId) {
    return (
      <Card className="mx-auto max-w-2xl p-7 text-center sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gate/10 text-gate">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-primary-ink">Draft context is unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Return to the source document and extract again. No Care plan has been activated.
        </p>
        <Button
          className="mt-6"
          onClick={() =>
            navigate({
              to: "/provider/patients/$patientId/document",
              params: { patientId },
            })
          }
        >
          <ArrowLeft className="size-4" />
          Return to source document
        </Button>
      </Card>
    );
  }

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <Badge variant="gate">Human gate · Draft only</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
            Verify {result.patient.name}&apos;s Care actions
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            {result.actions.length} actions were extracted from a{" "}
            {result.document.documentType.replaceAll("_", " ")}. Check every source quote before
            activation.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            navigate({
              to: "/provider/patients/$patientId/document",
              params: { patientId },
            })
          }
        >
          <ArrowLeft className="size-4" />
          Back to document
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {result.actions.map((action, index) => (
          <Card className="p-5 sm:p-6" key={action.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {index + 1} · {actionLabels[action.type]}
                </p>
                <h2 className="mt-2 text-xl font-bold text-primary-ink">{action.title}</h2>
              </div>
              <Badge variant={action.priority === "URGENT" ? "warning" : "neutral"}>
                {action.priority.toLowerCase()}
              </Badge>
            </div>
            <p className="mt-4 text-sm leading-6 text-text">{action.instructions}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <CalendarDays className="size-4" />
              {action.dueDate
                ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
                    new Date(action.dueDate),
                  )
                : "No due date stated"}
            </div>
            <blockquote className="mt-5 rounded-2xl bg-primary-soft/60 p-4 text-sm leading-6 text-primary-ink">
              <Quote className="mb-2 size-4 text-primary" />
              {action.sourceText}
            </blockquote>
          </Card>
        ))}
      </div>

      <Card className="border-gate/20 bg-gate/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <p className="font-bold text-primary-ink">All actions remain unverified and draft</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Editing, verification, and explicit activation are implemented in ISSUE-005.
          </p>
        </div>
        <Button variant="gate" className="mt-4 sm:mt-0" disabled>
          <ShieldCheck className="size-4" />
          Activate after verification
        </Button>
      </Card>
    </section>
  );
}
