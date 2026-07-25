import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCheck, CircleDotDashed, ShieldCheck } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export function LandingPage() {
  return (
    <section className="grid items-center gap-8 py-4 lg:grid-cols-[1.08fr_0.92fr] lg:py-12">
      <div>
        <Badge>Provider-verified care continuity</Badge>
        <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-primary-ink sm:text-6xl">
          No patient lost between prescription and recovery.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-lg">
          Naadi Loop turns medical instructions into clear care actions and keeps every test,
          medicine, referral, and follow-up moving until the loop is closed.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/patient/next">
              Open patient view
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/provider/dashboard">Open provider view</Link>
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative rounded-[1.5rem] bg-primary-ink p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                Rajan’s care loop
              </p>
              <p className="mt-2 text-2xl font-bold">2 of 6 complete</p>
            </div>
            <div className="grid size-16 place-items-center rounded-full border-[7px] border-white/20 border-r-success text-sm font-bold">
              33%
            </div>
          </div>
          <div className="mt-7 rounded-2xl bg-white p-5 text-text shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Next action
            </p>
            <p className="mt-2 text-lg font-semibold">Complete your CBC blood test tomorrow.</p>
            <p className="mt-2 text-sm text-muted">PHC laboratory · Before 11:00 am</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { Icon: ShieldCheck, label: "Provider verified" },
            { Icon: CircleDotDashed, label: "Action tracked" },
            { Icon: CheckCheck, label: "Loop closed" },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-2xl bg-primary-soft px-3 py-3 text-xs font-semibold text-primary-ink"
            >
              <Icon className="size-4 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
