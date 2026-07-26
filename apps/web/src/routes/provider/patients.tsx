import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  KeyRound,
  Languages,
  LoaderCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { UhidQrScanner } from "../../components/uhid-qr-scanner";
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
import { trpc } from "../../lib/trpc";

type Language = "en" | "ml" | "hi";

const languageLabels: Record<Language, string> = {
  en: "English",
  ml: "Malayalam",
  hi: "Hindi",
};

export function ProviderPatientsPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const patientsQuery = trpc.patient.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uhidInput, setUhidInput] = useState("");
  const [lookupUhid, setLookupUhid] = useState("");
  const [otp, setOtp] = useState("");
  const normalizedInput = uhidInput.trim().toUpperCase();

  const lookupQuery = trpc.patient.findByUhid.useQuery(
    { uhid: lookupUhid },
    {
      enabled: Boolean(lookupUhid),
      retry: false,
    },
  );

  const linkPatient = trpc.patient.linkByUhid.useMutation({
    onSuccess: async () => {
      await utils.patient.list.invalidate();
      setDialogOpen(false);
      setUhidInput("");
      setLookupUhid("");
      setOtp("");
    },
  });

  const resetDialog = () => {
    setUhidInput("");
    setLookupUhid("");
    setOtp("");
    linkPatient.reset();
  };

  const useScannedUhid = (uhid: string) => {
    linkPatient.reset();
    setUhidInput(uhid);
    setLookupUhid(uhid);
    setOtp("");
  };

  const searchPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    linkPatient.reset();
    if (normalizedInput === lookupUhid) {
      void lookupQuery.refetch();
    } else {
      setLookupUhid(normalizedInput);
    }
  };

  const confirmLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    linkPatient.mutate({ uhid: lookupUhid, otp });
  };

  return (
    <section className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="max-w-2xl">
          <Badge variant="info">Provider workspace · Consent-based access</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
            Your Patients
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Patients remain independent after registration. Search their UHID and confirm consent
            before they appear in this Hospital.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Link Patient
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary-ink">
                Link a registered Patient
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-muted">
                Ask the Patient for their UHID. The production flow will send an OTP to their
                registered phone.
              </DialogDescription>
            </DialogHeader>

            <UhidQrScanner onDetected={useScannedUhid} />

            <div className="flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
              <span className="h-px flex-1 bg-border" />
              or enter manually
              <span className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-4" onSubmit={searchPatient}>
              <label className="space-y-2" htmlFor="patient-uhid">
                <span className="text-sm font-semibold">Patient UHID</span>
                <Input
                  id="patient-uhid"
                  value={uhidInput}
                  onChange={(event) => {
                    setUhidInput(event.target.value.toUpperCase());
                    if (lookupUhid) {
                      setLookupUhid("");
                      setOtp("");
                    }
                  }}
                  placeholder="UHID-..."
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </label>
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={!normalizedInput || lookupQuery.isFetching}
              >
                {lookupQuery.isFetching ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                {lookupQuery.isFetching ? "Searching…" : "Search UHID"}
              </Button>
            </form>

            {lookupQuery.isError ? (
              <p className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning" role="alert">
                {lookupQuery.error.message}
              </p>
            ) : null}

            {lookupQuery.data ? (
              <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary-soft/35 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary">
                    <UserRound className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-primary-ink">{lookupQuery.data.patient.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      {lookupQuery.data.patient.uhid}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      OTP destination: phone {lookupQuery.data.patient.phoneHint}
                    </p>
                  </div>
                </div>

                {lookupQuery.data.alreadyAssigned ? (
                  <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success-ink">
                    This Patient is already linked to your Hospital.
                  </p>
                ) : (
                  <form className="space-y-3" onSubmit={confirmLink}>
                    <div className="rounded-xl bg-white p-3 text-xs leading-5 text-muted">
                      <span className="font-bold text-primary-ink">MVP demo OTP:</span> use{" "}
                      <span className="font-mono font-bold text-primary">000000</span>. No real
                      message is sent.
                    </div>
                    <label className="space-y-2" htmlFor="patient-otp">
                      <span className="text-sm font-semibold">Six-digit OTP</span>
                      <Input
                        id="patient-otp"
                        value={otp}
                        onChange={(event) =>
                          setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="000000"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                      />
                    </label>
                    {linkPatient.error ? (
                      <p
                        className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning"
                        role="alert"
                      >
                        {linkPatient.error.message}
                      </p>
                    ) : null}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={otp.length !== 6 || linkPatient.isPending}
                    >
                      {linkPatient.isPending ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-4" />
                      )}
                      {linkPatient.isPending ? "Confirming…" : "Confirm consent and link"}
                    </Button>
                  </form>
                )}
              </div>
            ) : null}
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
          <RefreshCw className="size-8 text-warning" />
          <h2 className="mt-4 text-lg font-bold text-primary-ink">Patients could not be loaded</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Refresh the page or sign in again, then retry.
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
          <h2 className="mt-4 text-xl font-bold text-primary-ink">No linked Patients yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Search a registered Patient&apos;s UHID and confirm the demo OTP to add them to this
            Hospital.
          </p>
          <Button className="mt-5" onClick={() => setDialogOpen(true)}>
            <KeyRound className="size-4" />
            Link the first Patient
          </Button>
        </Card>
      ) : null}

      {patientsQuery.isSuccess && patientsQuery.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patientsQuery.data.map((patient) => (
            <Card
              key={patient.id}
              className="group flex min-h-60 flex-col p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <UserRound className="size-5" />
                </div>
                <Badge variant="success">Consent linked</Badge>
              </div>
              <h2 className="mt-5 text-xl font-bold text-primary-ink">{patient.name}</h2>
              <p className="mt-1 break-all font-mono text-[11px] text-muted">{patient.uhid}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                {patient.age ? <span>Age {patient.age}</span> : null}
                <span className="flex items-center gap-1">
                  <Languages className="size-3.5" />
                  {languageLabels[patient.language as Language] ?? patient.language}
                </span>
                {patient.phone ? (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3.5" />
                    Phone verified
                  </span>
                ) : null}
              </div>
              <Button
                variant="secondary"
                className="mt-auto w-full"
                onClick={() =>
                  void navigate({
                    to: "/provider/patients/$patientId",
                    params: { patientId: patient.id },
                  })
                }
              >
                View Patient workspace
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </Button>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
