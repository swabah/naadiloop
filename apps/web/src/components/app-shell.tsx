import { Link, Outlet } from "@tanstack/react-router";
import {
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { BrandMark } from "./brand-mark";
import { RoleToggle } from "./role-toggle";

const navLinkClass =
  "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted transition hover:bg-white hover:text-text [&.active]:bg-white [&.active]:text-primary-ink [&.active]:shadow-sm";

function HeaderNav() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" aria-label="Naadi Loop home">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-white/80 border border-gray-200 rounded-full px-3 py-1 text-xs">
                <span className="font-semibold text-gray-900">{user.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    user.role === "super_admin"
                      ? "bg-purple-100 text-purple-800"
                      : user.role === "patient"
                        ? "bg-teal-100 text-teal-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {user.role === "hospital_admin"
                    ? "Hospital"
                    : user.role === "pharmacy_admin"
                      ? "Pharmacy"
                      : user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-primary-ink transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Link>
            </div>
          )}
          <RoleToggle />
        </div>
      </div>
      {isAuthenticated && user && (
        <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {(user.role === "patient" || user.role === "super_admin") && (
            <>
              <Link to="/patient/next" className={navLinkClass}>
                <HeartPulse className="size-4" />
                Patient Home
              </Link>
              <Link to="/patient/journey" className={navLinkClass}>
                <ClipboardList className="size-4" />
                Journey
              </Link>
            </>
          )}

          {(user.role === "hospital_admin" ||
            user.role === "pharmacy_admin" ||
            user.role === "provider" ||
            user.role === "super_admin") && (
            <>
              <Link to="/provider/dashboard" className={navLinkClass}>
                <LayoutDashboard className="size-4" />
                Provider Dashboard
              </Link>
              <Link to="/provider/patients" className={navLinkClass}>
                <UsersRound className="size-4" />
                Patients
              </Link>
            </>
          )}

          {user.role === "super_admin" && (
            <Link to="/admin/approvals" className={navLinkClass}>
              <ShieldCheck className="size-4 text-purple-600" />
              Super Admin Approvals
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <div className="min-h-dvh">
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[28rem] bg-hero-glow" />
        <HeaderNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <Outlet />
        </main>
        <footer className="mx-auto max-w-6xl px-6 pb-8 pt-4 text-center text-xs text-muted">
          Demo data only · No real patient information
        </footer>
      </div>
    </AuthProvider>
  );
}
