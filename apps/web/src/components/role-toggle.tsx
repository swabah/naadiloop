import { useNavigate } from "@tanstack/react-router";
import { HeartPulse, Stethoscope } from "lucide-react";
import { useState } from "react";
import { queryClient } from "../lib/query-client";
import { type DemoRole, getDemoRole, setDemoRole } from "../lib/role";
import { trpc } from "../lib/trpc";

const demoEmails: Record<DemoRole, string> = {
  patient: "rajan@naadi.demo",
  provider: "anjali@naadi.demo",
};

export function RoleToggle() {
  const [role, updateRole] = useState<DemoRole>(getDemoRole);
  const navigate = useNavigate();
  const login = trpc.auth.login.useMutation();

  const changeRole = async (nextRole: DemoRole) => {
    if (nextRole === role || login.isPending) return;

    try {
      await login.mutateAsync({ email: demoEmails[nextRole] });
      setDemoRole(nextRole);
      updateRole(nextRole);
      await queryClient.invalidateQueries();

      if (nextRole === "provider") {
        await navigate({ to: "/provider/patients" });
      } else {
        await navigate({ to: "/patient/next" });
      }
    } catch {
      // The mutation exposes the failure to assistive technology below.
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-muted md:inline">
        Demo view
      </span>
      <fieldset
        className="flex rounded-full border border-border/80 bg-white/80 p-1 shadow-sm backdrop-blur"
        aria-label="Demo view selector, not secure authentication"
        disabled={login.isPending}
      >
        <legend className="sr-only">Choose a seeded demo view</legend>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition data-[active=true]:bg-primary data-[active=true]:text-white"
          data-active={role === "patient"}
          aria-pressed={role === "patient"}
          onClick={() => void changeRole("patient")}
        >
          <HeartPulse className="size-3.5" />
          <span>Patient</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition data-[active=true]:bg-primary-ink data-[active=true]:text-white"
          data-active={role === "provider"}
          aria-pressed={role === "provider"}
          onClick={() => void changeRole("provider")}
        >
          <Stethoscope className="size-3.5" />
          <span>Provider</span>
        </button>
      </fieldset>
      {login.error ? (
        <span
          className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl bg-warning px-3 py-2 text-xs font-semibold text-white shadow-lg"
          role="alert"
        >
          Demo view unavailable. Try again.
        </span>
      ) : null}
    </div>
  );
}
