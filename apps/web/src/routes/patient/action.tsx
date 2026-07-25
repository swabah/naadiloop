import { Link, useParams } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowLeft,
  CalendarDays,
  Check,
  CircleHelp,
  LoaderCircle,
  Quote,
  RefreshCw,
  SkipForward,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { actionStateLabels, actionTypeLabels, formatActionDate } from "../../lib/action-display";
import { trpc } from "../../lib/trpc";

export function PatientActionPage() {
  const { actionId } = useParams({ from: "/patient/actions/$actionId" });
  const utils = trpc.useUtils();
  const [success, setSuccess] = useState<string | null>(null);
  const details = trpc.patient.actionDetails.useQuery({ actionId }, { refetchInterval: 5_000 });
  const refreshJourney = async () => {
    await Promise.all([
      utils.patient.nextAction.invalidate(),
      utils.patient.journey.invalidate(),
      utils.patient.actionDetails.invalidate({ actionId }),
    ]);
  };
  const complete = trpc.patient.markCompleted.useMutation({
    onSuccess: async (_, variables) => {
      setSuccess(
        variables.outcome === "taken"
          ? "Taken was recorded."
          : variables.outcome === "remind"
            ? "Your reminder request was recorded."
            : "This Care action was marked complete.",
      );
      await refreshJourney();
    },
  });
  const skip = trpc.patient.skipDose.useMutation({
    onSuccess: async () => {
      setSuccess("The skipped outcome was recorded for your Provider.");
      await refreshJourney();
    },
  });
  const pending = complete.isPending || skip.isPending;

  if (details.isPending) {
    return <Card className="h-[30rem] animate-pulse bg-white/60" role="status" />;
  }

  if (details.isError) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">
          This Care action could not be loaded
        </h1>
        <p className="mt-2 text-sm text-muted">{details.error.message}</p>
        <Button className="mt-5" onClick={() => void details.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  const { action, patient } = details.data;
  return (
    <section className="space-y-6">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/patient/journey">
          <ArrowLeft className="size-4" />
          Back to Care timeline
        </Link>
      </Button>
      <Card className="overflow-hidden">
        <div className="bg-primary-soft p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{actionTypeLabels[action.type]}</Badge>
            <Badge variant={action.isOverdue ? "warning" : "neutral"}>
              {actionStateLabels[action.displayState]}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-primary-ink sm:text-4xl">{action.title}</h1>
          <p className="mt-2 text-sm text-muted">Care journey for {patient.name}</p>
        </div>
        <div className="space-y-6 p-6 sm:p-8">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted">What to do</h2>
            <p className="mt-2 text-lg leading-8">{action.instructions}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-bg p-4 text-sm">
            <CalendarDays className="size-5 text-primary" />
            <div>
              <p className="font-bold text-primary-ink">Deadline</p>
              <p className="text-muted">{formatActionDate(action.dueDate)}</p>
            </div>
          </div>
          <blockquote className="rounded-2xl border border-primary/10 bg-primary-soft/50 p-5 text-sm leading-6 text-primary-ink">
            <Quote className="mb-2 size-5 text-primary" />
            <p>{action.sourceText}</p>
            <footer className="mt-2 text-xs text-muted">
              Source instruction verified by the Provider
            </footer>
          </blockquote>
          {action.displayState === "awaiting_review" ? (
            <p className="rounded-2xl bg-accent/10 p-4 text-sm leading-6 text-text">
              Your report is awaiting Provider review. You do not need to interpret it yourself.
            </p>
          ) : null}
          {success ? (
            <p className="rounded-2xl bg-success/10 p-4 text-sm font-semibold text-success-ink">
              {success}
            </p>
          ) : null}
          {complete.error || skip.error ? (
            <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning" role="alert">
              {complete.error?.message ?? skip.error?.message}
            </p>
          ) : null}
          {action.status === "PENDING" || action.status === "DUE" ? (
            <div className="space-y-3 border-t border-border pt-6">
              <h2 className="text-sm font-bold text-primary-ink">Record an update</h2>
              {action.type === "MEDICATION" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    disabled={pending}
                    onClick={() => complete.mutate({ actionId, outcome: "taken" })}
                  >
                    {pending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Taken
                  </Button>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => skip.mutate({ actionId })}
                  >
                    <SkipForward className="size-4" />
                    Skipped
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={pending}
                    onClick={() => complete.mutate({ actionId, outcome: "remind" })}
                  >
                    <AlarmClock className="size-4" />
                    Remind me
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/patient/help" search={{ actionId }}>
                      <CircleHelp className="size-4" />I need help
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    disabled={pending}
                    onClick={() => complete.mutate({ actionId, outcome: "completed" })}
                  >
                    {pending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Mark completed
                  </Button>
                  {action.type === "TEST" ? (
                    <Button asChild variant="secondary">
                      <Link to="/patient/actions/$actionId/report" params={{ actionId }}>
                        <UploadCloud className="size-4" />
                        Upload report
                      </Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link to="/patient/help" search={{ actionId }}>
                      <CircleHelp className="size-4" />
                      Ask for help
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          {action.type === "TEST" && action.status === "COMPLETED" ? (
            <Button asChild className="w-full">
              <Link to="/patient/actions/$actionId/report" params={{ actionId }}>
                <UploadCloud className="size-4" />
                Upload the test report
              </Link>
            </Button>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
