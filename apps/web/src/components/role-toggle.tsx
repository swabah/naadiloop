import { useNavigate } from "@tanstack/react-router";
import { HeartPulse, Stethoscope } from "lucide-react";
import { useState } from "react";
import { type DemoRole, getDemoRole, setDemoRole } from "../lib/role";

export function RoleToggle() {
  const [role, updateRole] = useState<DemoRole>(getDemoRole);
  const navigate = useNavigate();

  const changeRole = (nextRole: DemoRole) => {
    setDemoRole(nextRole);
    updateRole(nextRole);

    if (nextRole === "provider") {
      void navigate({ to: "/provider/dashboard" });
    } else {
      void navigate({ to: "/patient/next" });
    }
  };

  return (
    <fieldset
      className="flex rounded-full border border-border/80 bg-white/80 p-1 shadow-sm backdrop-blur"
      aria-label="Demo role"
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition data-[active=true]:bg-primary data-[active=true]:text-white"
        data-active={role === "patient"}
        aria-pressed={role === "patient"}
        onClick={() => changeRole("patient")}
      >
        <HeartPulse className="size-3.5" />
        <span className="hidden sm:inline">Patient</span>
      </button>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition data-[active=true]:bg-primary-ink data-[active=true]:text-white"
        data-active={role === "provider"}
        aria-pressed={role === "provider"}
        onClick={() => changeRole("provider")}
      >
        <Stethoscope className="size-3.5" />
        <span className="hidden sm:inline">Provider</span>
      </button>
    </fieldset>
  );
}
