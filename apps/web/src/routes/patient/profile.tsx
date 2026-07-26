import { Fingerprint, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { UhidQrCode } from "../../components/uhid-qr-code";
import { Badge } from "../../components/ui/badge";
import { Card } from "../../components/ui/card";
import { trpc } from "../../lib/trpc";

export function PatientProfilePage() {
  const me = trpc.auth.me.useQuery(undefined, { refetchInterval: 5_000 });

  if (me.isPending) {
    return (
      <section
        className="grid gap-5 lg:grid-cols-2"
        aria-label="Loading Patient profile"
        role="status"
      >
        <Card className="h-72 animate-pulse bg-white/60" />
        <Card className="h-[32rem] animate-pulse bg-white/60" />
      </section>
    );
  }

  if (me.isError || !me.data || me.data.role !== "patient" || !me.data.uhid) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <Fingerprint className="mx-auto size-10 text-warning" />
        <h1 className="mt-4 text-2xl font-bold text-primary-ink">Patient profile unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sign in with an active Patient account to view your UHID QR code.
        </p>
      </Card>
    );
  }

  return (
    <section className="space-y-7">
      <div>
        <Badge variant="info">Patient identity</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
          Your profile
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Share your UHID QR code with a Hospital to find your existing record without registering
          again.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(20rem,1.2fr)]">
        <Card className="p-5 sm:p-6">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UserRound className="size-6" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-primary-ink">{me.data.name}</h2>
          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl bg-bg px-4 py-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Email</p>
                <p className="mt-1 break-all text-sm font-semibold text-primary-ink">
                  {me.data.email}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-bg px-4 py-3">
              <Fingerprint className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">UHID</p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-primary-ink">
                  {me.data.uhid}
                </p>
              </div>
            </div>
            {me.data.linkRequest ? (
              <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary-soft/45 px-4 py-3">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">
                    Hospital linking OTP
                  </p>
                  <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.3em] text-primary-ink">
                    {me.data.linkRequest.otp}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {me.data.linkRequest.providerName} is trying to add you. Share this OTP only if
                    you approve. It expires in 10 minutes.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-success/15 bg-success/5 px-4 py-3 text-sm leading-6 text-success-ink">
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
            Scanning your QR does not grant access by itself. Hospital linking still requires your
            OTP consent.
          </div>
        </Card>

        <UhidQrCode uhid={me.data.uhid} />
      </div>
    </section>
  );
}
