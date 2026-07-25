import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, type LucideIcon, ShieldCheck } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface ScreenPlaceholderProps {
  audience: "Patient" | "Provider";
  title: string;
  description: string;
  icon: LucideIcon;
  gate?: boolean;
  nextTo?: "/patient/next" | "/patient/journey" | "/provider/dashboard";
  nextLabel?: string;
}

export function ScreenPlaceholder({
  audience,
  title,
  description,
  icon: Icon,
  gate,
  nextTo,
  nextLabel,
}: ScreenPlaceholderProps) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Badge variant={gate ? "gate" : "default"}>
            {gate ? "Human verification gate" : `${audience} workspace`}
          </Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">{description}</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-gate" />
        <CardContent className="grid gap-7 p-6 sm:grid-cols-[auto_1fr] sm:p-9">
          <div className="grid size-16 place-items-center rounded-[1.4rem] bg-primary-soft text-primary">
            <Icon className="size-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <CheckCircle2 className="size-4 text-success" />
              Route and contract ready
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              ISSUE-001 establishes this screen’s route, shared styling, role context, and typed API
              boundary. Functional care-loop behavior arrives in the next implementation issues.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {nextTo && (
                <Button asChild>
                  <Link to={nextTo}>
                    {nextLabel ?? "Continue"}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              )}
              <div className="flex items-center gap-2 text-xs font-medium text-muted">
                <ShieldCheck className="size-4 text-gate" />
                Provider verification stays mandatory
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
