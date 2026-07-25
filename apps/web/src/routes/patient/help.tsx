import { Link, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bus,
  CheckCircle2,
  HandHeart,
  HelpCircle,
  LoaderCircle,
  PhoneCall,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { trpc } from "../../lib/trpc";

type HelpKind = "caregiver" | "transport" | "understanding" | "provider";

const helpOptions = [
  {
    kind: "caregiver",
    label: "Caregiver help",
    description: "Ask someone you trust for support.",
    icon: Users,
  },
  {
    kind: "transport",
    label: "Transport",
    description: "Record that getting to care is difficult.",
    icon: Bus,
  },
  {
    kind: "understanding",
    label: "Instructions are unclear",
    description: "Ask for a clearer explanation.",
    icon: HelpCircle,
  },
  {
    kind: "provider",
    label: "Contact my Provider",
    description: "Ask the Provider team to follow up.",
    icon: PhoneCall,
  },
] as const;

export function PatientHelpPage() {
  const { actionId } = useSearch({ from: "/patient/help" });
  const me = trpc.auth.me.useQuery();
  const [kind, setKind] = useState<HelpKind | null>(null);
  const [notes, setNotes] = useState("");
  const request = trpc.patient.requestHelp.useMutation();

  if (request.isSuccess) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success-ink" />
        <h1 className="mt-5 text-3xl font-bold text-primary-ink">Your request was recorded</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The Provider dashboard will show that you need support.
        </p>
        <Button asChild className="mt-6">
          <Link to="/patient/next">Return to Patient home</Link>
        </Button>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" className="px-0">
        <Link
          to={actionId ? "/patient/actions/$actionId" : "/patient/next"}
          params={actionId ? { actionId } : {}}
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </Button>
      <div>
        <Badge variant="info">Patient support</Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink sm:text-4xl">
          What help do you need?
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Choose one option. This records an operational support request, not a medical emergency.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {helpOptions.map((option) => {
          const Icon = option.icon;
          const selected = kind === option.kind;
          return (
            <button
              type="button"
              key={option.kind}
              className={`rounded-2xl border p-5 text-left transition ${
                selected
                  ? "border-primary bg-primary-soft"
                  : "border-border bg-white hover:border-primary/30"
              }`}
              onClick={() => setKind(option.kind)}
              disabled={request.isPending}
            >
              <Icon className="size-5 text-primary" />
              <span className="mt-3 block font-bold text-primary-ink">{option.label}</span>
              <span className="mt-1 block text-sm leading-6 text-muted">{option.description}</span>
            </button>
          );
        })}
      </div>

      <Card className="p-5 sm:p-6">
        <label className="space-y-2" htmlFor="help-notes">
          <span className="text-sm font-bold">Anything else to share? Optional</span>
          <Textarea
            id="help-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1_000}
            disabled={request.isPending}
          />
        </label>
        {request.error ? (
          <p className="mt-4 rounded-2xl bg-warning/10 p-4 text-sm text-warning" role="alert">
            {request.error.message}
          </p>
        ) : null}
        <Button
          className="mt-5 w-full"
          disabled={!kind || !me.data?.patientId || request.isPending}
          onClick={() => {
            if (!kind || !me.data?.patientId) return;
            request.mutate({
              actionId,
              patientId: me.data.patientId,
              kind,
              notes: notes || undefined,
            });
          }}
        >
          {request.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <HandHeart className="size-4" />
          )}
          {request.isPending ? "Recording request…" : "Ask for help"}
        </Button>
      </Card>
    </section>
  );
}
