import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ClockAlert,
  FileClock,
  HeartHandshake,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { actionTypeLabels, formatActionDate } from "../../lib/action-display";
import { trpc } from "../../lib/trpc";

const sectionConfig = {
  requiresAttention: {
    title: "Requires attention",
    description: "Patient support and repeated unconfirmed medication outcomes.",
    icon: HeartHandshake,
    tone: "text-warning bg-warning/10",
  },
  awaitingReview: {
    title: "Awaiting review",
    description: "Returned reports that need an explicit Provider review.",
    icon: FileClock,
    tone: "text-gate bg-gate/10",
  },
  overdue: {
    title: "Overdue",
    description: "Past-due Care actions without completion or closure.",
    icon: ClockAlert,
    tone: "text-warning bg-warning/10",
  },
  onTrack: {
    title: "On track",
    description: "Active Care actions without a current operational gap.",
    icon: CheckCircle2,
    tone: "text-success-ink bg-success/10",
  },
} as const;

export function ProviderDashboardPage() {
  const dashboard = trpc.provider.dashboard.useQuery(undefined, { refetchInterval: 5_000 });

  if (dashboard.isPending) {
    return (
      <div className="grid gap-5 lg:grid-cols-2" role="status" aria-label="Loading dashboard">
        {[0, 1, 2, 3].map((item) => (
          <Card className="h-72 animate-pulse bg-white/60" key={item} />
        ))}
      </div>
    );
  }

  if (dashboard.isError) {
    return (
      <Card className="p-8 text-center">
        <RefreshCw className="mx-auto size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">
          The continuity dashboard could not be loaded
        </h1>
        <p className="mt-2 text-sm text-muted">{dashboard.error.message}</p>
        <Button className="mt-5" onClick={() => void dashboard.refetch()}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </Card>
    );
  }

  const total = dashboard.data.items.length;
  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge variant="info">Provider workspace · Operational signals</Badge>
          <h1 className="mt-4 text-3xl font-bold text-primary-ink sm:text-4xl">
            Care continuity dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Deterministic Care-gap rules update every five seconds. These are workflow signals, not
            diagnoses or risk scores.
          </p>
        </div>
        <Button variant="outline" onClick={() => void dashboard.refetch()}>
          <RefreshCw className="size-4" />
          Refresh now
        </Button>
      </div>

      {total === 0 ? (
        <Card className="p-10 text-center">
          <LayoutDashboard className="mx-auto size-9 text-muted" />
          <h2 className="mt-4 text-xl font-bold text-primary-ink">No active Care journeys</h2>
          <p className="mt-2 text-sm text-muted">
            Dashboard items appear after a Provider activates a verified Care plan.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {(Object.keys(sectionConfig) as Array<keyof typeof sectionConfig>).map((sectionKey) => {
            const config = sectionConfig[sectionKey];
            const Icon = config.icon;
            const items = dashboard.data.sections[sectionKey];
            return (
              <Card className="overflow-hidden" key={sectionKey}>
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                  <div className="flex gap-3">
                    <div
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${config.tone}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-primary-ink">{config.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-muted">{config.description}</p>
                    </div>
                  </div>
                  <Badge
                    variant={items.length > 0 && sectionKey !== "onTrack" ? "warning" : "neutral"}
                  >
                    {items.length}
                  </Badge>
                </div>
                <div className="divide-y divide-border">
                  {items.length === 0 ? (
                    <p className="p-6 text-sm text-muted">No items in this section.</p>
                  ) : (
                    items.map((item) => (
                      <article className="p-5" key={item.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-primary">
                              {item.type ? actionTypeLabels[item.type] : "Patient support"}
                            </p>
                            <h3 className="mt-1 font-bold text-primary-ink">{item.title}</h3>
                            <p className="mt-1 text-xs text-muted">{item.patient.name}</p>
                          </div>
                          {item.dueDate ? (
                            <span className="shrink-0 text-xs text-muted">
                              {formatActionDate(item.dueDate)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-text">{item.reason}</p>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          Next: {item.nextProviderAction}
                        </p>
                        <div className="mt-4">
                          {item.reportId ? (
                            <Button asChild size="sm" variant="gate">
                              <Link
                                to="/provider/reports/$reportId"
                                params={{ reportId: item.reportId }}
                              >
                                Review report
                                <ArrowRight className="size-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm" variant="outline">
                              <Link to="/provider/patients">
                                View Patient context
                                <ArrowRight className="size-4" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
