import { Link, Outlet } from "@tanstack/react-router";
import { Bell, ClipboardList, HeartPulse, LayoutDashboard, UsersRound } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { RoleToggle } from "./role-toggle";

const navLinkClass =
  "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition hover:bg-white hover:text-text [&.active]:bg-white [&.active]:text-primary-ink [&.active]:shadow-sm";

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[28rem] bg-hero-glow" />
      <header className="sticky top-0 z-40 border-b border-white/60 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Naadi Loop home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden size-10 place-items-center rounded-full border border-border/80 bg-white/80 text-muted shadow-sm sm:grid"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
            </button>
            <RoleToggle />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          <Link to="/patient/next" className={navLinkClass}>
            <HeartPulse className="size-4" />
            Patient home
          </Link>
          <Link to="/patient/journey" className={navLinkClass}>
            <ClipboardList className="size-4" />
            Journey
          </Link>
          <Link to="/provider/dashboard" className={navLinkClass}>
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
          <Link to="/provider/patients" className={navLinkClass}>
            <UsersRound className="size-4" />
            Patients
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 pt-4 text-center text-xs text-muted">
        Demo data only · No real patient information
      </footer>
    </div>
  );
}
