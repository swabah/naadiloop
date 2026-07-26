import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  Clock3,
  HeartPulse,
  ListChecks,
  RefreshCw,
} from "lucide-react";
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
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">Patient profile unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with an active Patient account to view Care actions.
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
          Refresh the page or sign in again, then retry.
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
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="info">Your care today</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
            Hello, {me.data?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Here is the next step in your care journey.
          </p>
        </div>
        {me.data?.uhid ? (
          <div className="w-fit rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-border">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
              Your UHID
            </p>
            <p className="mt-1 break-all font-mono text-sm font-bold text-primary-ink">
              {me.data.uhid}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <Card className="overflow-hidden">
          <div className="relative overflow-hidden bg-primary px-6 py-6 text-white sm:px-8 sm:py-8">
            <div className="absolute -right-12 -top-16 size-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-16 right-20 size-36 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/75">
                <CalendarDays className="size-4" />
                {actionTypeLabels[action.type]}
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-bold leading-tight sm:text-4xl">
                {awaitingReview ? "Your report is with your Provider" : action.title}
              </h2>
            </div>
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
            <p className="mt-5 text-base leading-7 text-text sm:text-lg sm:leading-8">
              {awaitingReview
                ? "Your report was received. You do not need to interpret it; your Provider will communicate the next step."
                : action.instructions}
            </p>
            <Button asChild className="mt-7 w-full sm:w-auto">
              <Link to="/patient/actions/$actionId" params={{ actionId: action.id }}>
                View this care action
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                <HeartPulse className="size-5" />
              </div>
              <span className="text-2xl font-bold text-primary-ink">{progressPercent}%</span>
            </div>
            <h2 className="mt-5 font-bold text-primary-ink">Journey progress</h2>
            <p className="mt-1 text-sm text-muted">
              {nextAction.data.progress.completed} of {nextAction.data.progress.total} actions
              completed
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-soft">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <Button asChild variant="ghost" className="mt-3 w-full justify-between px-0">
              <Link to="/patient/journey">
                View complete timeline
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="grid size-11 place-items-center rounded-2xl bg-success/10 text-success-ink">
              <CircleHelp className="size-5" />
            </div>
            <h2 className="mt-5 font-bold text-primary-ink">Need help?</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Send a support request to your care Provider from your current action.
            </p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/patient/actions/$actionId" params={{ actionId: action.id }}>
                Open action details
              </Link>
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
