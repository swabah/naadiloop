import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  HeartHandshake,
  Languages,
  LoaderCircle,
  Phone,
  Plus,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { trpc } from "../../lib/trpc";

type Language = "en" | "ml" | "hi";

interface PatientForm {
  name: string;
  age: string;
  phone: string;
  language: Language;
  caregiverName: string;
  caregiverPhone: string;
}

const emptyForm: PatientForm = {
  name: "",
  age: "",
  phone: "",
  language: "en",
  caregiverName: "",
  caregiverPhone: "",
};

const languageLabels: Record<Language, string> = {
  en: "English",
  ml: "Malayalam",
  hi: "Hindi",
};

function validatePatient(form: PatientForm): string | null {
  if (!form.name.trim()) return "Enter the Patient's name.";
  if (form.age && (!/^\d{1,3}$/.test(form.age) || Number(form.age) > 130)) {
    return "Age must be a whole number from 0 to 130.";
  }
  if (form.phone.trim() && form.phone.trim().length < 5) {
    return "Patient phone number must have at least 5 characters.";
  }
  if (form.caregiverPhone.trim() && form.caregiverPhone.trim().length < 5) {
    return "Caregiver phone number must have at least 5 characters.";
  }
  return null;
}

export function ProviderPatientsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const patientsQuery = trpc.patient.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PatientForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const createPatient = trpc.patient.create.useMutation({
    onSuccess: async () => {
      await utils.patient.list.invalidate();
      setForm(emptyForm);
      setFormError(null);
      setDialogOpen(false);
    },
  });

  const updateForm = <Key extends keyof PatientForm>(key: Key, value: PatientForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validatePatient(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    createPatient.mutate({
      name: form.name,
      age: form.age,
      phone: form.phone,
      language: form.language,
      caregiverContact: {
        name: form.caregiverName,
        phone: form.caregiverPhone,
      },
    });
  };

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <Badge variant="info">Provider workspace · Demo data</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
            Choose a Patient
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Start with a fictional Patient profile, then add the medical instruction that will
            become their Care plan.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setFormError(null);
              createPatient.reset();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Add Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary-ink">
                Add a fictional Patient
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-muted">
                Demo data only. Do not enter real patient information.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-5" onSubmit={submitPatient}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2" htmlFor="patient-name">
                  <span className="text-sm font-semibold">Patient name *</span>
                  <Input
                    id="patient-name"
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. Maya Thomas"
                    autoComplete="off"
                    maxLength={160}
                  />
                </label>
                <label className="space-y-2" htmlFor="patient-age">
                  <span className="text-sm font-semibold">Age</span>
                  <Input
                    id="patient-age"
                    value={form.age}
                    onChange={(event) => updateForm("age", event.target.value)}
                    placeholder="e.g. 62"
                    inputMode="numeric"
                    maxLength={3}
                  />
                </label>
                <label className="space-y-2" htmlFor="patient-phone">
                  <span className="text-sm font-semibold">Phone</span>
                  <Input
                    id="patient-phone"
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="Fictional number"
                    inputMode="tel"
                    autoComplete="off"
                    maxLength={32}
                  />
                </label>
                <div className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold">Preferred language</span>
                  <Select
                    value={form.language}
                    onValueChange={(value: Language) => updateForm("language", value)}
                  >
                    <SelectTrigger aria-label="Preferred language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ml">Malayalam</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl bg-primary-soft/55 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <HeartHandshake className="size-4 text-primary" />
                  <h2 className="text-sm font-bold text-primary-ink">Caregiver contact</h2>
                  <span className="text-xs text-muted">Optional</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={form.caregiverName}
                    onChange={(event) => updateForm("caregiverName", event.target.value)}
                    placeholder="Caregiver name"
                    aria-label="Caregiver name"
                    autoComplete="off"
                    maxLength={160}
                  />
                  <Input
                    value={form.caregiverPhone}
                    onChange={(event) => updateForm("caregiverPhone", event.target.value)}
                    placeholder="Fictional number"
                    aria-label="Caregiver phone"
                    inputMode="tel"
                    autoComplete="off"
                    maxLength={32}
                  />
                </div>
              </div>

              {formError || createPatient.error ? (
                <p className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
                  {formError ?? "The Patient could not be saved. Check the details and try again."}
                </p>
              ) : null}

              <Button type="submit" className="w-full" disabled={createPatient.isPending}>
                {createPatient.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {createPatient.isPending ? "Saving Patient…" : "Save Patient"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {patientsQuery.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="status"
          aria-label="Loading Patients"
        >
          {[0, 1, 2].map((item) => (
            <Card className="h-52 animate-pulse bg-white/55" key={item} />
          ))}
        </div>
      ) : null}

      {patientsQuery.isError ? (
        <Card className="flex min-h-64 flex-col items-center justify-center p-7 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-warning/10 text-warning">
            <RefreshCw className="size-5" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-primary-ink">Patients could not be loaded</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Make sure the Provider demo view is selected, then try the request again.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => void patientsQuery.refetch()}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </Card>
      ) : null}

      {patientsQuery.isSuccess && patientsQuery.data.length === 0 ? (
        <Card className="flex min-h-72 flex-col items-center justify-center p-7 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UsersRound className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-primary-ink">No Patients yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Add a fictional Patient to begin the Provider workflow.
          </p>
          <Button className="mt-5" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add the first Patient
          </Button>
        </Card>
      ) : null}

      {patientsQuery.isSuccess && patientsQuery.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patientsQuery.data.map((patient) => (
            <Card
              key={patient.id}
              className="group flex min-h-56 flex-col p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <UserRound className="size-5" />
                </div>
                <Badge variant="neutral">Fictional</Badge>
              </div>
              <h2 className="mt-5 text-xl font-bold text-primary-ink">{patient.name}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                {patient.age ? <span>Age {patient.age}</span> : null}
                <span className="flex items-center gap-1">
                  <Languages className="size-3.5" />
                  {languageLabels[patient.language as Language] ?? patient.language}
                </span>
                {patient.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3.5" />
                    Contact added
                  </span>
                ) : null}
              </div>
              <Button
                variant="secondary"
                className="mt-auto w-full"
                onClick={() =>
                  void navigate({
                    to: "/provider/patients/$patientId/document",
                    params: { patientId: patient.id },
                  })
                }
              >
                Continue care journey
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Button>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
