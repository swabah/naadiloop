import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Circle, Clock3, LockKeyhole, RefreshCw } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { actionStateLabels, actionTypeLabels, formatActionDate } from "../../lib/action-display";
import { trpc } from "../../lib/trpc";

export function PatientJourneyPage() {
  const me = trpc.auth.me.useQuery();
  const patientId = me.data?.patientId;
  const journey = trpc.patient.journey.useQuery(
    { patientId: patientId ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: Boolean(patientId), refetchInterval: 5_000 },
  );

  if (me.isPending || (patientId && journey.isPending)) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading Care journey">
        {[0, 1, 2].map((item) => (
          <Card className="h-40 animate-pulse bg-white/60" key={item} />
        ))}
      </div>
    );
  }

  if (!patientId) {
    return (
      <Card className="p-8 text-center">
        <Circle className="mx-auto size-8 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">Patient profile unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with an active Patient account to view the Care timeline.
        </p>
      </Card>
    );
  }

  if (me.isError || journey.isError) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">
          The Care timeline could not be loaded
        </h1>
        <Button className="mt-5" onClick={() => void journey.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  const progressPercent =
    journey.data.progress.total === 0
      ? 0
      : Math.round((journey.data.progress.completed / journey.data.progress.total) * 100);

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge variant="info">Patient journey</Badge>
          <h1 className="mt-4 text-3xl font-bold text-primary-ink sm:text-4xl">
            Your complete Care timeline
          </h1>
        </div>
        <div className="min-w-52">
          <p className="text-sm font-semibold text-primary-ink">
            {journey.data.progress.completed} of {journey.data.progress.total} completed
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-soft">
            <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {journey.data.actions.length === 0 ? (
        <Card className="p-10 text-center">
          <Circle className="mx-auto size-8 text-muted" />
          <h2 className="mt-4 text-xl font-bold text-primary-ink">No active journey yet</h2>
          <p className="mt-2 text-sm text-muted">
            Only Care actions activated by a Provider appear here.
          </p>
        </Card>
      ) : (
        <ol className="relative space-y-4 before:absolute before:bottom-8 before:left-6 before:top-8 before:w-px before:bg-border sm:before:left-8">
          {journey.data.actions.map((action) => {
            const complete = ["completed", "reviewed", "closed"].includes(action.displayState);
            return (
              <li key={action.id} className="relative">
                <Card className={`ml-12 p-5 sm:ml-16 sm:p-6 ${action.locked ? "opacity-70" : ""}`}>
                  <div
                    className={`absolute left-2 top-6 z-10 grid size-9 place-items-center rounded-full border-4 border-bg sm:left-4 ${
                      complete
                        ? "bg-success text-white"
                        : action.isOverdue
                          ? "bg-warning text-white"
                          : "bg-primary-soft text-primary"
                    }`}
                  >
                    {action.locked ? (
                      <LockKeyhole className="size-4" />
                    ) : complete ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Clock3 className="size-4" />
                    )}
                  </div>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        {actionTypeLabels[action.type]}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-primary-ink">{action.title}</h2>
                    </div>
                    <Badge
                      variant={action.isOverdue ? "warning" : complete ? "success" : "neutral"}
                    >
                      {action.locked ? "Upcoming" : actionStateLabels[action.displayState]}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
                    {action.displayState === "awaiting_review"
                      ? "Report received. Awaiting Provider review and the communicated next step."
                      : action.instructions}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-muted">{formatActionDate(action.dueDate)}</span>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/patient/actions/$actionId" params={{ actionId: action.id }}>
                        Details
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
