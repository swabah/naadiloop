import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
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
};

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
});

const toServerAction = (action: EditableAction) => ({
  type: action.type,
  title: action.title,
  instructions: action.instructions,
  dueDate: inputValueToIsoDate(action.dueDate) ?? undefined,
  priority: action.priority,
  sourceText: action.sourceText,
  assignedTo: action.assignedTo,
  reviewRequired: action.reviewRequired,
  payload: {},
});

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
                    onValueChange={(value: ActionType) => updateAction(action.key, "type", value)}
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
