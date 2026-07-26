import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock3, RefreshCw } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { actionStateLabels, actionTypeLabels, formatActionDate } from "../../lib/action-display";
import { trpc } from "../../lib/trpc";

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PatientJourneyPage() {
  const me = trpc.auth.me.useQuery();
  const patientId = me.data?.patientId;
  const now = new Date();
  const journey = trpc.patient.journey.useQuery(
    {
      patientId: patientId ?? "00000000-0000-4000-8000-000000000000",
      date: localDateValue(now),
      timezoneOffsetMinutes: now.getTimezoneOffset(),
    },
    { enabled: Boolean(patientId), refetchInterval: 30_000, refetchOnWindowFocus: true },
  );

  if (me.isPending || (patientId && journey.isPending)) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading care journey">
        {[0, 1, 2].map((item) => (
          <Card className="h-24 animate-pulse bg-white/60" key={item} />
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
          Sign in with an active Patient account to view the Care journey.
        </p>
      </Card>
    );
  }

  if (me.isError || journey.isError) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">
          The Care journey could not be loaded
        </h1>
        <Button className="mt-5" onClick={() => void journey.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  const groups = [
    {
      label: "Active",
      description: "Needs attention now",
      actions: journey.data.actions.filter(
        (action) =>
          !action.locked && !["completed", "reviewed", "closed"].includes(action.displayState),
      ),
    },
    {
      label: "Upcoming",
      description: "Planned next",
      actions: journey.data.actions.filter((action) => action.locked),
    },
    {
      label: "Completed",
      description: "Your recorded history",
      actions: journey.data.actions.filter((action) =>
        ["completed", "reviewed", "closed"].includes(action.displayState),
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <Button asChild variant="ghost" className="px-0">
          <Link to="/patient/next">
            <ArrowLeft className="size-4" />
            Today
          </Link>
        </Button>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary-ink">Your journey</h1>
            <p className="mt-1 text-sm text-muted">A simple view of active and completed care.</p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-primary">
            {journey.data.progress.completed}/{journey.data.progress.total} complete
          </p>
        </div>
      </header>

      {journey.data.actions.length === 0 ? (
        <Card className="p-10 text-center">
          <Circle className="mx-auto size-8 text-muted" />
          <h2 className="mt-4 text-xl font-bold text-primary-ink">No active journey yet</h2>
          <p className="mt-2 text-sm text-muted">
            Provider-confirmed Care actions will appear here after activation.
          </p>
        </Card>
      ) : (
        groups.map((group) => {
          if (group.actions.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <h2 className="font-bold text-primary-ink">{group.label}</h2>
                  <p className="text-xs text-muted">{group.description}</p>
                </div>
                <span className="text-xs text-muted">{group.actions.length}</span>
              </div>
              <Card className="divide-y divide-border overflow-hidden">
                {group.actions.map((action) => {
                  const complete = ["completed", "reviewed", "closed"].includes(
                    action.displayState,
                  );
                  return (
                    <div className="flex items-center gap-3 p-4" key={action.id}>
                      <div
                        className={`grid size-9 shrink-0 place-items-center rounded-full ${
                          complete
                            ? "bg-success/10 text-success-ink"
                            : action.isOverdue
                              ? "bg-warning/10 text-warning"
                              : "bg-primary-soft text-primary"
                        }`}
                      >
                        {complete ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Clock3 className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-bold text-primary-ink">{action.title}</h3>
                          <Badge variant="neutral" className="text-[0.65rem]">
                            {actionTypeLabels[action.type]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {action.medicationToday
                            ? action.medicationToday.total > 0
                              ? `${action.medicationToday.resolved} of ${action.medicationToday.total} doses resolved today`
                              : "Medication course not scheduled for today"
                            : `${actionStateLabels[action.displayState]} · ${formatActionDate(action.dueDate)}`}
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          to="/patient/actions/$actionId"
                          params={{ actionId: action.id }}
                          aria-label={`View ${action.title}`}
                        >
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </Card>
            </div>
          );
        })
      )}
    </section>
  );
}
