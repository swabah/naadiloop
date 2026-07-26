import { Link, useParams } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  FileText,
  HeartHandshake,
  Languages,
  LayoutDashboard,
  LoaderCircle,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { actionTypeLabels, formatActionDate } from "../../lib/action-display";
import { trpc } from "../../lib/trpc";

const languageLabels: Record<string, string> = {
  en: "English",
  ml: "Malayalam",
  hi: "Hindi",
};

const actionStatusLabels = {
  PENDING: "Pending",
  DUE: "Due now",
  COMPLETED: "Completed",
  AWAITING_REVIEW: "Awaiting review",
  REVIEWED: "Reviewed",
  CLOSED: "Closed",
} as const;

const documentLabels = {
  discharge_summary: "Discharge summary",
  prescription: "Prescription",
  referral: "Referral",
  lab_form: "Lab form",
  other: "Other document",
} as const;

const eventLabels = {
  created: "Action created",
  verified: "Provider verified",
  activated: "Journey activated",
  completed: "Patient completed",
  skipped: "Outcome skipped",
  reminder_requested: "Reminder requested",
  help_requested: "Support requested",
  review_started: "Report returned",
  reviewed: "Provider reviewed",
  closed: "Loop closed",
  follow_up_created: "Follow-up created",
  help_resolved: "Support resolved",
} as const;

const formatTimestamp = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function ProviderPatientPage() {
  const { patientId } = useParams({ from: "/provider/patients/$patientId" });
  const utils = trpc.useUtils();
  const overview = trpc.provider.patientOverview.useQuery(
    { patientId },
    { refetchInterval: 5_000 },
  );
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const resolveHelp = trpc.provider.resolveHelpRequest.useMutation({
    onSuccess: async () => {
      setRequestId(null);
      setResolution("");
      await Promise.all([
        utils.provider.patientOverview.invalidate({ patientId }),
        utils.provider.dashboard.invalidate(),
      ]);
    },
  });

  if (overview.isPending) {
    return (
      <section className="space-y-5" role="status" aria-label="Loading Patient workspace">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-primary-soft" />
        <Card className="h-56 animate-pulse bg-white/60" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Card className="h-28 animate-pulse bg-white/60" key={item} />
          ))}
        </div>
      </section>
    );
  }

  if (overview.isError) {
    const unauthorized = overview.error.data?.code === "FORBIDDEN";
    return (
      <Card className="mx-auto flex min-h-96 max-w-2xl flex-col items-center justify-center p-8 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-warning/10 text-warning">
          {unauthorized ? <ShieldCheck className="size-7" /> : <RefreshCw className="size-7" />}
        </div>
        <h1 className="mt-5 text-2xl font-bold text-primary-ink">
          {unauthorized ? "Patient access is not available" : "Patient workspace could not load"}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">{overview.error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/provider/patients">
              <ArrowLeft className="size-4" />
              Back to Patients
            </Link>
          </Button>
          {!unauthorized ? (
            <Button onClick={() => void overview.refetch()}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  const data = overview.data;
  const activePlans = data.carePlans.filter((plan) => plan.status === "active");
  const draftPlans = data.carePlans.filter(
    (plan) => plan.status === "draft" || plan.status === "verified",
  );
  const closedPlans = data.carePlans.filter((plan) => plan.status === "closed");
  const summaryCards = [
    {
      label: "Active journeys",
      value: data.summary.activeJourneys,
      icon: ClipboardList,
      tone: "bg-primary-soft text-primary",
    },
    {
      label: "Drafts to finish",
      value: data.summary.drafts,
      icon: FileText,
      tone: "bg-gate/10 text-gate",
    },
    {
      label: "Open actions",
      value: data.summary.openActions,
      icon: Clock3,
      tone: "bg-warning/10 text-warning",
    },
    {
      label: "Awaiting review",
      value: data.summary.awaitingReview,
      icon: FileCheck2,
      tone: "bg-gate/10 text-gate",
    },
    {
      label: "Support requests",
      value: data.summary.supportRequests,
      icon: HeartHandshake,
      tone: "bg-warning/10 text-warning",
    },
    {
      label: "Closed actions",
      value: data.summary.closedActions,
      icon: CheckCircle2,
      tone: "bg-success/10 text-success-ink",
    },
  ];

  const renderPlanGroup = (
    title: string,
    description: string,
    plans: typeof data.carePlans,
    emptyMessage: string,
  ) => (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-primary-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {plans.length === 0 ? (
        <Card className="border-dashed p-6 text-sm text-muted">{emptyMessage}</Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card className="overflow-hidden" key={plan.id}>
              <div className="flex flex-col justify-between gap-4 border-b border-border/70 bg-primary-soft/20 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        plan.status === "closed"
                          ? "success"
                          : plan.status === "verified"
                            ? "gate"
                            : plan.status === "active"
                              ? "info"
                              : "neutral"
                      }
                    >
                      {plan.status === "active"
                        ? "Active journey"
                        : plan.status === "closed"
                          ? "Closed journey"
                          : plan.status === "verified"
                            ? "Verified draft"
                            : "Draft"}
                    </Badge>
                    {plan.document ? (
                      <Badge variant="outline">{documentLabels[plan.document.documentType]}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Created {formatTimestamp(plan.createdAt)} · {plan.actions.length} Care action
                    {plan.actions.length === 1 ? "" : "s"}
                  </p>
                </div>
                {plan.status === "draft" || plan.status === "verified" ? (
                  <Button asChild size="sm" variant="gate">
                    <Link
                      to="/provider/patients/$patientId/verify"
                      params={{ patientId }}
                      search={{ carePlanId: plan.id, manual: false }}
                    >
                      Resume draft
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>

              {plan.actions.length === 0 ? (
                <div className="p-5 text-sm text-muted">
                  No Care actions have been added to this plan yet.
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {plan.actions.map((action) => (
                    <article className="p-5" id={`action-${action.id}`} key={action.id}>
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-primary">
                            {actionTypeLabels[action.type]}
                          </p>
                          <h3 className="mt-1 text-base font-bold text-primary-ink">
                            {action.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              action.status === "CLOSED"
                                ? "success"
                                : action.status === "AWAITING_REVIEW"
                                  ? "gate"
                                  : action.priority === "URGENT"
                                    ? "warning"
                                    : "neutral"
                            }
                          >
                            {actionStatusLabels[action.status]}
                          </Badge>
                          <Badge variant="outline">{formatActionDate(action.dueDate)}</Badge>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-text">{action.instructions}</p>
                      <div className="mt-3 rounded-2xl bg-[#f8f9fc] p-3 text-xs leading-5 text-muted">
                        <span className="font-bold text-primary-ink">Source:</span>{" "}
                        {action.sourceText}
                      </div>

                      {action.report ? (
                        <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-gate/15 bg-gate/5 p-4 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-primary-ink">
                              {action.report.fileName}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {action.report.fileType} ·{" "}
                              {Math.max(1, Math.round(action.report.fileSize / 1024))} KB ·{" "}
                              {action.report.status === "REVIEWED" ? "Reviewed" : "Awaiting review"}
                            </p>
                            {action.report.providerComment ? (
                              <p className="mt-2 text-xs leading-5 text-text">
                                Provider note: {action.report.providerComment}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            asChild
                            size="sm"
                            variant={
                              action.report.status === "AWAITING_REVIEW" ? "gate" : "outline"
                            }
                          >
                            <Link
                              to="/provider/reports/$reportId"
                              params={{ reportId: action.report.id }}
                            >
                              {action.report.status === "AWAITING_REVIEW"
                                ? "Review report"
                                : "View review"}
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      ) : null}

                      {action.events.length > 0 ? (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-xs font-bold text-primary">
                            View activity ({action.events.length})
                          </summary>
                          <div className="mt-3 space-y-2 border-l-2 border-primary-soft pl-4">
                            {action.events.map((event) => (
                              <div key={event.id}>
                                <p className="text-xs font-bold text-primary-ink">
                                  {eventLabels[event.eventType]}
                                </p>
                                <p className="mt-0.5 text-[0.68rem] text-muted">
                                  {formatTimestamp(event.timestamp)}
                                  {event.notes ? ` · ${event.notes}` : ""}
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <section className="space-y-7">
      <Button asChild variant="ghost" className="px-0">
        <Link to="/provider/patients">
          <ArrowLeft className="size-4" />
          Back to Patients
        </Link>
      </Button>

      <Card className="relative overflow-hidden p-0">
        <div className="absolute inset-x-0 top-0 h-28 bg-[#dfe7ff]" />
        <div className="relative p-5 pt-16 sm:p-7 sm:pt-16">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              <div className="grid size-20 shrink-0 place-items-center rounded-3xl border-4 border-white bg-primary text-2xl font-extrabold text-white shadow-sm">
                {data.patient.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-primary-ink sm:text-3xl">
                    {data.patient.name}
                  </h1>
                  <Badge variant="success">Consent linked</Badge>
                </div>
                <p className="mt-1 font-mono text-xs font-bold text-primary">{data.patient.uhid}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <Link to="/provider/dashboard">
                  <LayoutDashboard className="size-4" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild>
                <Link
                  to="/provider/patients/$patientId/document"
                  params={{ patientId: data.patient.id }}
                >
                  <Plus className="size-4" />
                  Add Care information
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-muted sm:grid-cols-2 lg:grid-cols-4">
            <span className="flex items-center gap-2">
              <UserRound className="size-4 text-primary" />
              {data.patient.age ? `Age ${data.patient.age}` : "Age not provided"}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="size-4 text-primary" />
              {data.patient.phone ?? "Phone not provided"}
            </span>
            <span className="flex items-center gap-2">
              <Languages className="size-4 text-primary" />
              {languageLabels[data.patient.language] ?? data.patient.language}
            </span>
            <span className="flex items-center gap-2">
              <UsersRound className="size-4 text-primary" />
              {data.patient.caregiverContact?.name
                ? `${data.patient.caregiverContact.name}${data.patient.caregiverContact.phone ? ` · ${data.patient.caregiverContact.phone}` : ""}`
                : "No caregiver listed"}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card className="p-4" key={item.label}>
              <div className={`grid size-10 place-items-center rounded-2xl ${item.tone}`}>
                <Icon className="size-5" />
              </div>
              <p className="mt-4 text-2xl font-bold text-primary-ink">{item.value}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{item.label}</p>
            </Card>
          );
        })}
      </div>

      {data.supportRequests.length > 0 ? (
        <Card className="border-warning/20 p-5 sm:p-6" id="support-requests">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warning/10 text-warning">
              <HeartHandshake className="size-5" />
            </div>
            <div>
              <h2 className="font-bold text-primary-ink">Open support requests</h2>
              <p className="mt-1 text-sm text-muted">
                Record how each Patient request was resolved.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.supportRequests.map((request) => (
              <div
                className="flex flex-col justify-between gap-3 rounded-2xl bg-warning/5 p-4 sm:flex-row sm:items-center"
                key={request.id}
              >
                <div>
                  <p className="text-sm font-bold text-primary-ink">
                    {request.actionTitle ?? "Patient-level support request"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {request.notes ?? "Patient requested support."} ·{" "}
                    {formatTimestamp(request.timestamp)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    resolveHelp.reset();
                    setRequestId(request.id);
                  }}
                >
                  Resolve request
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.carePlans.length === 0 ? (
        <Card className="flex min-h-64 flex-col items-center justify-center p-7 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <ClipboardList className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-primary-ink">
            Start this Patient&apos;s first Care journey
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Add a source document or paste medical instructions, then verify the extracted Care
            actions before activation.
          </p>
          <Button asChild className="mt-5">
            <Link
              to="/provider/patients/$patientId/document"
              params={{ patientId: data.patient.id }}
            >
              <Plus className="size-4" />
              Add Care information
            </Link>
          </Button>
        </Card>
      ) : activePlans.length === 0 && draftPlans.length === 0 && closedPlans.length > 0 ? (
        <Card className="flex items-start gap-4 border-success/15 bg-success/5 p-5 sm:p-6">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success/10 text-success-ink">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-primary-ink">All current Care journeys are closed</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              The completed history remains below. Add new Care information when another journey
              begins.
            </p>
          </div>
        </Card>
      ) : null}

      {data.carePlans.length > 0 ? (
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-8">
            {renderPlanGroup(
              "Active Care journeys",
              "Verified actions currently visible to the Patient.",
              activePlans,
              "No active journey is currently assigned by this Provider.",
            )}
            {renderPlanGroup(
              "Drafts",
              "Saved plans that still require Provider verification or activation.",
              draftPlans,
              "There are no unfinished drafts.",
            )}
            {renderPlanGroup(
              "Closed history",
              "Completed loops remain available as a traceable medical footprint.",
              closedPlans,
              "No Care journeys have been closed yet.",
            )}
          </div>

          <aside>
            <Card className="p-5 xl:sticky xl:top-8">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Activity className="size-5" />
                </div>
                <div>
                  <h2 className="font-bold text-primary-ink">Recent activity</h2>
                  <p className="text-xs text-muted">Updates every five seconds</p>
                </div>
              </div>
              {data.activity.length === 0 ? (
                <p className="mt-5 text-sm leading-6 text-muted">
                  Activity will appear when this Patient’s journey begins.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {data.activity.slice(0, 10).map((event) => (
                    <div className="relative border-l-2 border-primary-soft pl-4" key={event.id}>
                      <span className="absolute -left-[0.32rem] top-1 size-2 rounded-full bg-primary" />
                      <p className="text-xs font-bold text-primary-ink">
                        {eventLabels[event.eventType]}
                      </p>
                      <p className="mt-1 text-[0.68rem] leading-5 text-muted">
                        {event.actionTitle ? `${event.actionTitle} · ` : ""}
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </div>
      ) : null}

      <Dialog
        open={Boolean(requestId)}
        onOpenChange={(open) => {
          if (!open) {
            setRequestId(null);
            setResolution("");
            resolveHelp.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary-ink">
              Resolve support request
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted">
              Record the response or assistance provided to the Patient.
            </DialogDescription>
          </DialogHeader>
          <label className="space-y-2" htmlFor="support-resolution">
            <span className="text-sm font-bold text-primary-ink">Resolution</span>
            <Textarea
              id="support-resolution"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Describe how the request was resolved…"
              maxLength={1_000}
            />
          </label>
          {resolveHelp.error ? (
            <p className="mt-3 rounded-2xl bg-warning/10 p-3 text-sm text-warning" role="alert">
              {resolveHelp.error.message}
            </p>
          ) : null}
          <Button
            className="mt-5 w-full"
            disabled={!requestId || !resolution.trim() || resolveHelp.isPending}
            onClick={() => {
              if (requestId && resolution.trim()) {
                resolveHelp.mutate({ eventId: requestId, resolution: resolution.trim() });
              }
            }}
          >
            {resolveHelp.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {resolveHelp.isPending ? "Saving resolution…" : "Mark resolved"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
