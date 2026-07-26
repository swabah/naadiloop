import { Link } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  LoaderCircle,
  RefreshCw,
  SkipForward,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { actionTypeLabels } from "../../lib/action-display";
import { trpc } from "../../lib/trpc";

const sectionDetails = {
  overdue: { label: "Overdue", icon: AlarmClock, tone: "text-warning" },
  now: { label: "Now", icon: Clock3, tone: "text-primary" },
  later: { label: "Later today", icon: Clock3, tone: "text-muted" },
  done: { label: "Done", icon: CheckCircle2, tone: "text-success-ink" },
} as const;

type Section = keyof typeof sectionDetails;

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDoseTime(value: string | null) {
  if (!value) return "No set time";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PatientNextPage() {
  const now = useMemo(() => new Date(), []);
  const date = localDateValue(now);
  const timezoneOffsetMinutes = now.getTimezoneOffset();
  const me = trpc.auth.me.useQuery();
  const patientId = me.data?.patientId;
  const utils = trpc.useUtils();
  const [message, setMessage] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabled] = useState(
    () => typeof Notification !== "undefined" && Notification.permission === "granted",
  );
  const today = trpc.patient.today.useQuery(
    {
      patientId: patientId ?? "00000000-0000-4000-8000-000000000000",
      date,
      timezoneOffsetMinutes,
    },
    {
      enabled: Boolean(patientId),
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  );
  const recordDose = trpc.patient.recordDose.useMutation({
    onSuccess: async (_, variables) => {
      setMessage(
        variables.status === "taken" ? "Dose marked as taken." : "Dose marked as skipped.",
      );
      await Promise.all([utils.patient.today.invalidate(), utils.patient.journey.invalidate()]);
    },
  });

  useEffect(() => {
    if (!remindersEnabled || !today.data || typeof Notification === "undefined") return;
    const nextDose = today.data.items.find(
      (item) =>
        item.kind === "medication_dose" &&
        item.status === null &&
        item.scheduledFor &&
        new Date(item.scheduledFor).getTime() > Date.now(),
    );
    if (!nextDose?.scheduledFor) return;
    const delay = new Date(nextDose.scheduledFor).getTime() - Date.now();
    if (delay > 2_147_000_000) return;
    const timer = window.setTimeout(
      () => {
        new Notification("Naadi medication reminder", {
          body: "It is time to check your confirmed care plan.",
        });
        void today.refetch();
      },
      Math.max(delay, 0),
    );
    return () => window.clearTimeout(timer);
  }, [remindersEnabled, today.data, today.refetch]);

  const enableReminders = async () => {
    if (typeof Notification === "undefined") {
      setMessage("Browser notifications are not supported on this device.");
      return;
    }
    const permission = await Notification.requestPermission();
    setRemindersEnabled(permission === "granted");
    setMessage(
      permission === "granted"
        ? "Reminders are enabled while this app is open."
        : "Notifications were not enabled. Your in-app checklist still works.",
    );
  };

  if (me.isPending || (patientId && today.isPending)) {
    return (
      <section className="space-y-4" aria-label="Loading today's care" role="status">
        <div className="h-16 animate-pulse rounded-2xl bg-primary-soft" />
        <Card className="h-80 animate-pulse bg-white/60" />
      </section>
    );
  }

  if (!patientId) {
    return (
      <Card className="p-8 text-center">
        <UserRound className="mx-auto size-9 text-primary" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">Patient profile unavailable</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with an active Patient account to view today&apos;s care.
        </p>
      </Card>
    );
  }

  if (me.isError || today.isError) {
    return (
      <Card className="mx-auto flex min-h-72 max-w-2xl flex-col items-center justify-center p-7 text-center">
        <RefreshCw className="size-8 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">
          Today&apos;s care could not be loaded
        </h1>
        <p className="mt-2 text-sm text-muted">Refresh the page or sign in again, then retry.</p>
        <Button className="mt-5" onClick={() => void today.refetch()}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </Card>
    );
  }

  const progress =
    today.data.progress.total === 0
      ? 0
      : Math.round((today.data.progress.resolved / today.data.progress.total) * 100);

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">
            {new Intl.DateTimeFormat(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(now)}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-primary-ink">
            Hello, {me.data?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-1 text-sm text-muted">Here is what needs your attention today.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void enableReminders()}
          disabled={remindersEnabled}
        >
          {remindersEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
          {remindersEnabled ? "Reminders on" : "Enable reminders"}
        </Button>
      </header>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-primary-ink">Today&apos;s progress</p>
            <p className="mt-0.5 text-sm text-muted">
              {today.data.progress.resolved} of {today.data.progress.total} items resolved
            </p>
          </div>
          <span className="text-xl font-bold text-primary">{progress}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-soft">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      {message ? (
        <p
          className="rounded-xl bg-primary-soft/70 px-4 py-3 text-sm text-primary-ink"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {recordDose.error ? (
        <p className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
          {recordDose.error.message}
        </p>
      ) : null}

      {today.data.items.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="mx-auto size-9 text-success" />
          <h2 className="mt-3 text-xl font-bold text-primary-ink">Nothing needs attention today</h2>
          <p className="mt-1 text-sm text-muted">
            New Provider-confirmed care actions will appear here.
          </p>
        </Card>
      ) : (
        (["overdue", "now", "later", "done"] as Section[]).map((section) => {
          const items = today.data.items.filter((item) => item.section === section);
          if (items.length === 0) return null;
          const details = sectionDetails[section];
          const Icon = details.icon;
          return (
            <div key={section}>
              <div className={`mb-2 flex items-center gap-2 ${details.tone}`}>
                <Icon className="size-4" />
                <h2 className="text-sm font-bold uppercase tracking-wider">{details.label}</h2>
                <span className="text-xs">({items.length})</span>
              </div>
              <Card className="divide-y divide-border overflow-hidden">
                {items.map((item) => (
                  <div
                    className={`p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 ${
                      section === "done" ? "bg-bg/60" : ""
                    }`}
                    key={item.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-primary-ink">{item.title}</p>
                        <Badge variant="neutral" className="text-[0.65rem]">
                          {item.kind === "medication_dose"
                            ? "Medication"
                            : actionTypeLabels[item.actionType]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {formatDoseTime(item.scheduledFor)}
                        {item.status ? ` · ${item.status === "taken" ? "Taken" : "Skipped"}` : ""}
                      </p>
                    </div>
                    <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
                      {item.kind === "medication_dose" && item.status === null ? (
                        <>
                          <Button
                            size="sm"
                            disabled={recordDose.isPending || !item.scheduledFor}
                            onClick={() =>
                              item.scheduledFor &&
                              recordDose.mutate({
                                actionId: item.actionId,
                                scheduledFor: item.scheduledFor,
                                status: "taken",
                                timezoneOffsetMinutes,
                              })
                            }
                          >
                            {recordDose.isPending ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4" />
                            )}
                            Taken
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={recordDose.isPending || !item.scheduledFor}
                            onClick={() =>
                              item.scheduledFor &&
                              recordDose.mutate({
                                actionId: item.actionId,
                                scheduledFor: item.scheduledFor,
                                status: "skipped",
                                timezoneOffsetMinutes,
                              })
                            }
                          >
                            <SkipForward className="size-4" />
                            Skip
                          </Button>
                        </>
                      ) : (
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to="/patient/actions/$actionId"
                            params={{ actionId: item.actionId }}
                          >
                            Details
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          );
        })
      )}

      <nav
        className="grid grid-cols-3 gap-2 border-t border-border pt-4"
        aria-label="Patient links"
      >
        <Button asChild variant="ghost" size="sm">
          <Link to="/patient/journey">
            <ArrowRight className="size-4" />
            Journey
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/patient/help" search={{ actionId: undefined }}>
            <CircleHelp className="size-4" />
            Help
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/patient/profile">
            <UserRound className="size-4" />
            Profile
          </Link>
        </Button>
      </nav>
    </section>
  );
}
