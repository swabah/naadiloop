import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  LoaderCircle,
  Plus,
  Quote,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { trpc } from "../../lib/trpc";

type ActionType = "MEDICATION" | "TEST" | "REFERRAL" | "FOLLOW_UP";
type Priority = "NORMAL" | "URGENT";

const actionLabels: Record<ActionType, string> = {
  MEDICATION: "Medication",
  TEST: "Test",
  REFERRAL: "Referral",
  FOLLOW_UP: "Follow-up",
};

const actionTypeOptions: ActionType[] = ["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"];

type EditableAction = {
  key: string;
  type: ActionType;
  title: string;
  instructions: string;
  dueDate: string;
  priority: Priority;
  sourceText: string;
  assignedTo: string;
  reviewRequired: boolean;
  medicationSchedule: string;
  medicationFrequency: 1 | 2 | 3 | 4;
  medicationDoseTimes: string[];
  medicationStartDate: string;
  medicationDurationDays: string;
};

const suggestedDoseTimes: Record<1 | 2 | 3 | 4, string[]> = {
  1: ["08:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "14:00", "20:00"],
  4: ["08:00", "12:00", "16:00", "20:00"],
};
const medicationDoseSlots = ["dose-1", "dose-2", "dose-3", "dose-4"] as const;

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const isoDateToInputValue = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const inputValueToIsoDate = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(`${value}T09:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const editableFromAction = (action: {
  type: ActionType;
  title: string;
  instructions: string;
  dueDate?: string | Date | null;
  priority: Priority;
  sourceText: string;
  assignedTo?: string;
  reviewRequired?: boolean;
  payload?: unknown;
}): EditableAction => ({
  key: crypto.randomUUID(),
  type: action.type,
  title: action.title,
  instructions: action.instructions,
  dueDate: isoDateToInputValue(
    action.dueDate instanceof Date ? action.dueDate.toISOString() : (action.dueDate ?? null),
  ),
  priority: action.priority,
  sourceText: action.sourceText,
  assignedTo: action.assignedTo ?? "patient",
  reviewRequired: action.reviewRequired ?? false,
  medicationSchedule:
    action.payload && typeof action.payload === "object" && "schedule" in action.payload
      ? String(action.payload.schedule ?? "")
      : "",
  medicationFrequency:
    action.payload &&
    typeof action.payload === "object" &&
    "frequencyPerDay" in action.payload &&
    [1, 2, 3, 4].includes(Number(action.payload.frequencyPerDay))
      ? (Number(action.payload.frequencyPerDay) as 1 | 2 | 3 | 4)
      : 1,
  medicationDoseTimes:
    action.payload &&
    typeof action.payload === "object" &&
    "doseTimes" in action.payload &&
    Array.isArray(action.payload.doseTimes)
      ? action.payload.doseTimes.map(String)
      : [...suggestedDoseTimes[1]],
  medicationStartDate:
    action.payload && typeof action.payload === "object" && "startDate" in action.payload
      ? String(action.payload.startDate ?? todayInputValue())
      : isoDateToInputValue(
          action.dueDate instanceof Date ? action.dueDate.toISOString() : action.dueDate,
        ) || todayInputValue(),
  medicationDurationDays:
    action.payload && typeof action.payload === "object" && "durationDays" in action.payload
      ? String(action.payload.durationDays ?? "")
      : "",
});

const toServerAction = (action: EditableAction) => {
  const base = {
    title: action.title,
    instructions: action.instructions,
    dueDate: inputValueToIsoDate(action.dueDate) ?? undefined,
    priority: action.priority,
    sourceText: action.sourceText,
    assignedTo: action.assignedTo,
    reviewRequired: action.reviewRequired,
  };
  if (action.type === "MEDICATION") {
    return {
      ...base,
      type: "MEDICATION" as const,
      payload: {
        schedule: action.medicationSchedule.trim() || undefined,
        frequencyPerDay: action.medicationFrequency,
        doseTimes: action.medicationDoseTimes,
        startDate: action.medicationStartDate,
        durationDays: action.medicationDurationDays
          ? Number(action.medicationDurationDays)
          : undefined,
      },
    };
  }
  if (action.type === "TEST") return { ...base, type: "TEST" as const, payload: {} };
  if (action.type === "REFERRAL") return { ...base, type: "REFERRAL" as const, payload: {} };
  return { ...base, type: "FOLLOW_UP" as const, payload: {} };
};

export function ProviderVerifyPage() {
  const { patientId } = useParams({ from: "/provider/patients/$patientId/verify" });
  const { carePlanId } = useSearch({ from: "/provider/patients/$patientId/verify" });
  const navigate = useNavigate();

  const draftQuery = trpc.carePlan.getDraft.useQuery(
    { carePlanId: carePlanId ?? "" },
    { enabled: Boolean(carePlanId) },
  );

  const verifyMutation = trpc.carePlan.verify.useMutation();
  const activateMutation = trpc.carePlan.activate.useMutation();

  const initialActions = useMemo<EditableAction[]>(() => {
    if (draftQuery.data) {
      return draftQuery.data.actions.map((action) =>
        editableFromAction({
          type: action.type,
          title: action.title,
          instructions: action.instructions,
          dueDate: action.dueDate,
          priority: action.priority,
          sourceText: action.sourceText,
          assignedTo: action.assignedTo,
          reviewRequired: action.reviewRequired,
          payload: action.payload,
        }),
      );
    }
    return [];
  }, [draftQuery.data]);

  const [actions, setActions] = useState<EditableAction[]>(initialActions);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActions(initialActions);
  }, [initialActions]);

  if (!draftQuery.data && (carePlanId || draftQuery.isError)) {
    return (
      <Card className="mx-auto max-w-2xl p-7 text-center sm:p-10">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning/10 text-warning">
          <AlertTriangle className="size-6" />
        </div>
        <Badge variant="warning" className="mt-5">
          Draft context missing
        </Badge>
        <h1 className="mt-4 text-3xl font-bold text-primary-ink">
          This draft is no longer available
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The persisted draft was not found or is not available to this Provider. Return to the
          source document and create it again.
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

  const patientName = draftQuery.data?.patient.name ?? "the Patient";
  const documentType = draftQuery.data?.documentType ?? "source_document";
  const sourceContent = draftQuery.data?.sourceContent ?? "";

  const updateAction = <Key extends keyof EditableAction>(
    key: string,
    field: Key,
    value: EditableAction[Key],
  ) => {
    setActions((current) =>
      current.map((action) => (action.key === key ? { ...action, [field]: value } : action)),
    );
  };

  const addAction = () => {
    setActions((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        type: "FOLLOW_UP",
        title: "New follow-up action",
        instructions: "Describe what the patient should do.",
        dueDate: "",
        priority: "NORMAL",
        sourceText: "",
        assignedTo: "patient",
        reviewRequired: false,
        medicationSchedule: "",
        medicationFrequency: 1,
        medicationDoseTimes: [...suggestedDoseTimes[1]],
        medicationStartDate: todayInputValue(),
        medicationDurationDays: "",
      },
    ]);
  };

  const removeAction = (key: string) => {
    setActions((current) => current.filter((action) => action.key !== key));
  };

  const validate = (): string | null => {
    if (actions.length === 0) return "Add at least one care action before saving.";
    for (const action of actions) {
      if (!action.title.trim()) return "Every action needs a title.";
      if (!action.instructions.trim()) return "Every action needs instructions.";
      if (!action.sourceText.trim()) {
        return `Action "${action.title}" is missing a source sentence.`;
      }
      if (action.type === "MEDICATION") {
        if (!action.medicationStartDate) {
          return `Medication "${action.title}" needs a start date.`;
        }
        if (action.medicationDoseTimes.length !== action.medicationFrequency) {
          return `Medication "${action.title}" needs one confirmed time for every daily dose.`;
        }
        const duration = action.medicationDurationDays
          ? Number(action.medicationDurationDays)
          : undefined;
        if (
          duration !== undefined &&
          (!Number.isInteger(duration) || duration < 1 || duration > 365)
        ) {
          return `Medication "${action.title}" duration must be between 1 and 365 days.`;
        }
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (carePlanId) {
      try {
        await verifyMutation.mutateAsync({
          carePlanId,
          actions: actions.map(toServerAction),
        });
        await draftQuery.refetch();
      } catch (mutationError) {
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "The care plan could not be saved.",
        );
      }
    }
  };

  const handleActivate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!carePlanId) {
      setError("Save the verification first, then activate the care journey.");
      return;
    }
    setError(null);
    try {
      await activateMutation.mutateAsync({
        carePlanId,
      });
      await navigate({ to: "/provider/dashboard" });
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "The care journey could not be activated.",
      );
    }
  };

  const planIsVerified = draftQuery.data?.plan.status === "verified";
  const planIsActive = draftQuery.data?.plan.status === "active";
  const saving = verifyMutation.isPending;
  const activating = activateMutation.isPending;
  const source = sourceContent.replace(/\s+/g, " ").trim().toLowerCase();
  const sourceMatchByAction = actions.map((action) =>
    source.length > 0 && action.sourceText.trim().length > 0
      ? source.includes(action.sourceText.replace(/\s+/g, " ").trim().toLowerCase())
      : null,
  );

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <Badge variant="gate">Human gate · Verify &amp; activate</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
            Verify {patientName}&apos;s Care actions
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            {actions.length} action{actions.length === 1 ? "" : "s"} drafted from a{" "}
            {documentType.replaceAll("_", " ")}. Edit, add, or remove actions, then save the
            verification before activating the care journey.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button asChild variant="ghost">
            <Link to="/provider/dashboard">Skip to dashboard</Link>
          </Button>
        </div>
      </div>

      {sourceContent ? (
        <Card className="border-primary/20 bg-primary-soft/35 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-primary shadow-sm">
              <Wand2 className="size-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                Source document
              </h2>
              <p className="mt-2 text-sm leading-6 text-text">{sourceContent}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        {actions.map((action, index) => {
          const matchesSource = sourceMatchByAction[index];
          return (
            <Card className="p-5 sm:p-6" key={action.key}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    {index + 1} · {actionLabels[action.type]}
                  </p>
                  <Input
                    className="mt-2 max-w-md text-xl font-bold text-primary-ink"
                    value={action.title}
                    onChange={(event) => updateAction(action.key, "title", event.target.value)}
                    aria-label="Action title"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={action.type}
                    onValueChange={(value: ActionType) => {
                      updateAction(action.key, "type", value);
                      if (value === "MEDICATION" && action.medicationDoseTimes.length === 0) {
                        updateAction(action.key, "medicationDoseTimes", [
                          ...suggestedDoseTimes[action.medicationFrequency],
                        ]);
                      }
                    }}
                  >
                    <SelectTrigger className="min-w-40" aria-label="Action type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {actionTypeOptions.map((option) => (
                        <SelectItem value={option} key={option}>
                          {actionLabels[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={action.priority}
                    onValueChange={(value: Priority) => updateAction(action.key, "priority", value)}
                  >
                    <SelectTrigger className="min-w-32" aria-label="Action priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAction(action.key)}
                    aria-label="Remove action"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {action.type === "MEDICATION" ? (
                <div className="mt-5 rounded-2xl border border-primary/15 bg-primary-soft/35 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <h3 className="font-bold text-primary-ink">Confirm medication schedule</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">
                        These times create the Patient&apos;s daily checklist and reminders. Confirm
                        them against the prescription before activation.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold" htmlFor={`frequency-${action.key}`}>
                        Times per day
                      </label>
                      <Select
                        value={String(action.medicationFrequency)}
                        onValueChange={(value) => {
                          const frequency = Number(value) as 1 | 2 | 3 | 4;
                          updateAction(action.key, "medicationFrequency", frequency);
                          updateAction(action.key, "medicationDoseTimes", [
                            ...suggestedDoseTimes[frequency],
                          ]);
                        }}
                      >
                        <SelectTrigger
                          id={`frequency-${action.key}`}
                          aria-label="Medication times per day"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {[1, 2, 3, 4].map((frequency) => (
                            <SelectItem value={String(frequency)} key={frequency}>
                              {frequency} {frequency === 1 ? "time" : "times"} daily
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold"
                        htmlFor={`medication-start-${action.key}`}
                      >
                        Start date
                      </label>
                      <Input
                        id={`medication-start-${action.key}`}
                        type="date"
                        value={action.medicationStartDate}
                        onChange={(event) =>
                          updateAction(action.key, "medicationStartDate", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-semibold"
                        htmlFor={`medication-duration-${action.key}`}
                      >
                        Duration (days)
                      </label>
                      <Input
                        id={`medication-duration-${action.key}`}
                        type="number"
                        min={1}
                        max={365}
                        placeholder="Ongoing"
                        value={action.medicationDurationDays}
                        onChange={(event) =>
                          updateAction(action.key, "medicationDurationDays", event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm font-semibold">Confirmed dose times</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-4">
                      {medicationDoseSlots
                        .slice(0, action.medicationFrequency)
                        .map((slot, doseIndex) => (
                          <div className="space-y-1" key={`${action.key}-${slot}`}>
                            <label className="text-xs text-muted" htmlFor={`${action.key}-${slot}`}>
                              Dose {doseIndex + 1}
                            </label>
                            <Input
                              id={`${action.key}-${slot}`}
                              type="time"
                              value={action.medicationDoseTimes[doseIndex] ?? ""}
                              onChange={(event) => {
                                const doseTimes = [...action.medicationDoseTimes];
                                doseTimes[doseIndex] = event.target.value;
                                updateAction(action.key, "medicationDoseTimes", doseTimes);
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label
                      className="text-sm font-semibold"
                      htmlFor={`medication-schedule-${action.key}`}
                    >
                      Prescription schedule text
                    </label>
                    <Input
                      id={`medication-schedule-${action.key}`}
                      placeholder="For example: after food"
                      value={action.medicationSchedule}
                      onChange={(event) =>
                        updateAction(action.key, "medicationSchedule", event.target.value)
                      }
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2" htmlFor={`instructions-${action.key}`}>
                  <span className="text-sm font-semibold">Instructions</span>
                  <Textarea
                    id={`instructions-${action.key}`}
                    value={action.instructions}
                    onChange={(event) =>
                      updateAction(action.key, "instructions", event.target.value)
                    }
                  />
                </label>
                <div className="space-y-4">
                  <label className="block space-y-2" htmlFor={`due-${action.key}`}>
                    <span className="text-sm font-semibold">Due date</span>
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3">
                      <CalendarDays className="size-4 text-muted" />
                      <input
                        id={`due-${action.key}`}
                        type="date"
                        className="h-11 w-full bg-transparent text-sm outline-none"
                        value={action.dueDate}
                        onChange={(event) =>
                          updateAction(action.key, "dueDate", event.target.value)
                        }
                      />
                    </div>
                  </label>
                  <label className="block space-y-2" htmlFor={`assigned-${action.key}`}>
                    <span className="text-sm font-semibold">Assigned to</span>
                    <Input
                      id={`assigned-${action.key}`}
                      value={action.assignedTo}
                      onChange={(event) =>
                        updateAction(action.key, "assignedTo", event.target.value)
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={action.reviewRequired}
                      onChange={(event) =>
                        updateAction(action.key, "reviewRequired", event.target.checked)
                      }
                    />
                    Review required before loop closure
                  </label>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">Linked source sentence</span>
                  {matchesSource === true ? (
                    <Badge variant="success">Source matched</Badge>
                  ) : matchesSource === false ? (
                    <Badge variant="warning">Not in source</Badge>
                  ) : null}
                </div>
                <Textarea
                  value={action.sourceText}
                  onChange={(event) => updateAction(action.key, "sourceText", event.target.value)}
                  className="min-h-20"
                />
                {action.sourceText.trim() ? (
                  <blockquote className="rounded-2xl bg-primary-soft/60 p-3 text-sm leading-6 text-primary-ink">
                    <Quote className="mb-1 inline size-3.5 text-primary" /> {action.sourceText}
                  </blockquote>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={addAction}>
          <Plus className="size-4" />
          Add care action
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || activating || planIsActive}
          >
            {saving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            {planIsVerified ? "Re-save verification" : "Save verification"}
          </Button>
          <Button
            type="button"
            variant="gate"
            onClick={handleActivate}
            disabled={saving || activating || !planIsVerified}
          >
            {activating ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {planIsActive ? "Activated" : "Activate care journey"}
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-warning/30 bg-warning/10 p-4" role="alert">
          <div className="flex items-start gap-2 text-sm text-warning-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
