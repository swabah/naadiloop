import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock3, HeartPulse, ListChecks, RefreshCw } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { actionStateLabels, actionTypeLabels, formatActionDate } from "../../lib/action-display";
import { trpc } from "../../lib/trpc";

export function PatientNextPage() {
  const me = trpc.auth.me.useQuery();
  const patientId = me.data?.patientId;
  const nextAction = trpc.patient.nextAction.useQuery(
    { patientId: patientId ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: Boolean(patientId), refetchInterval: 5_000 },
  );

  if (me.isPending || (patientId && nextAction.isPending)) {
    return (
      <section className="space-y-5" aria-label="Loading next Care action" role="status">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-primary-soft" />
        <Card className="h-96 animate-pulse bg-white/60" />
      </section>
    );
  }

  if (!patientId) {
    return (
      <Card className="p-8 text-center">
        <HeartPulse className="mx-auto size-9 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">Select the Patient demo view</h1>
        <p className="mt-2 text-sm text-muted">
          Patient Care actions are available only in the Patient demo view.
        </p>
      </Card>
    );
  }

  if (me.isError || nextAction.isError) {
    return (
      <Card className="mx-auto flex min-h-80 max-w-2xl flex-col items-center justify-center p-7 text-center">
        <RefreshCw className="size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">
          Your Care journey could not be loaded
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Check that the Patient demo view is selected, then try again.
        </p>
        <Button className="mt-5" onClick={() => void nextAction.refetch()}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </Card>
    );
  }

  const action = nextAction.data.action;
  if (!action) {
    return (
      <Card className="mx-auto flex min-h-96 max-w-2xl flex-col items-center justify-center p-7 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-success/10 text-success-ink">
          <CheckCircle2 className="size-7" />
        </div>
        <Badge variant="success" className="mt-5">
          {nextAction.data.allClosed ? "Journey closed" : "Nothing due"}
        </Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink">
          {nextAction.data.allClosed
            ? "Your current Care journey is complete"
            : "No action is waiting on you"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          {nextAction.data.allClosed
            ? "Your completed actions remain available in the timeline."
            : nextAction.data.progress.total > 0
              ? "Your current actions are recorded. Check the timeline for their latest state."
              : "A Provider-verified Care journey will appear here after activation."}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/patient/journey">
            <ListChecks className="size-4" />
            View timeline
          </Link>
        </Button>
      </Card>
    );
  }

  const awaitingReview = action.displayState === "awaiting_review";
  const progressPercent =
    nextAction.data.progress.total === 0
      ? 0
      : Math.round((nextAction.data.progress.completed / nextAction.data.progress.total) * 100);

  return (
    <section className="space-y-7">
      <div>
        <Badge variant="info">Patient home · Updates automatically</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
          What do I do next?
        </h1>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-primary px-6 py-5 text-white sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">
            {actionTypeLabels[action.type]}
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
            {awaitingReview ? "Wait for your Provider to review the report" : action.title}
          </h2>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={action.isOverdue ? "warning" : "default"}>
              {actionStateLabels[action.displayState]}
            </Badge>
            <span className="flex items-center gap-2 text-sm text-muted">
              <Clock3 className="size-4" />
              {formatActionDate(action.dueDate)}
            </span>
          </div>
          <p className="mt-5 text-lg leading-8 text-text">
            {awaitingReview
              ? "Your report was received. You do not need to interpret it; your Provider will communicate the next step."
              : action.instructions}
          </p>
          <Button asChild className="mt-7 w-full sm:w-auto">
            <Link to="/patient/actions/$actionId" params={{ actionId: action.id }}>
              View this Care action
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-bold text-primary-ink">Care journey progress</span>
          <span className="text-muted">
            {nextAction.data.progress.completed} of {nextAction.data.progress.total} completed
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-soft">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <Button asChild variant="ghost" className="mt-3 px-0">
          <Link to="/patient/journey">
            <HeartPulse className="size-4" />
            View the complete timeline
          </Link>
        </Button>
      </Card>
    </section>
  );
}
