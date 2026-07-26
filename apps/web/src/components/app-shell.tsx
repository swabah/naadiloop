import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  Fingerprint,
  HeartPulse,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  QrCode,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect } from "react";
import { AuthProvider, type AuthUser, useAuth } from "../lib/auth-context";
import { trpc } from "../lib/trpc";
import { BrandMark } from "./brand-mark";

interface NavItem {
  label: string;
  to:
    | "/patient/next"
    | "/patient/journey"
    | "/patient/profile"
    | "/provider/dashboard"
    | "/provider/patients"
    | "/admin/approvals";
  icon: ComponentType<{ className?: string }>;
}

function navItemsFor(user: AuthUser): NavItem[] {
  if (user.role === "patient") {
    return [
      { label: "Home", to: "/patient/next", icon: HeartPulse },
      { label: "Journey", to: "/patient/journey", icon: ClipboardList },
      { label: "Profile & QR", to: "/patient/profile", icon: QrCode },
    ];
  }
  if (user.role === "super_admin") {
    return [{ label: "Approvals", to: "/admin/approvals", icon: ShieldCheck }];
  }
  return [
    { label: "Dashboard", to: "/provider/dashboard", icon: LayoutDashboard },
    { label: "Patients", to: "/provider/patients", icon: UsersRound },
  ];
}

function roleLabel(role: AuthUser["role"]) {
  if (role === "hospital_admin") return "Hospital workspace";
  if (role === "pharmacy_admin") return "Pharmacy workspace";
  if (role === "super_admin") return "Platform administration";
  return "Patient workspace";
}

function PublicHeader() {
  return (
    <header className="relative z-40 px-4 pt-4 sm:px-6 sm:pt-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/90 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-5">
        <Link to="/" aria-label="Naadi home">
          <BrandMark />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-muted transition hover:bg-primary-soft hover:text-primary sm:px-4"
          >
            <LogIn className="size-4" />
            <span className="hidden sm:inline">Sign in</span>
          </Link>
          <Link
            to="/register"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#1d55d8] sm:px-4"
          >
            <UserPlus className="size-4" />
            Register
          </Link>
        </div>
      </div>
    </header>
  );
}

function WorkspaceSidebar({ user, logout }: { user: AuthUser; logout: () => void }) {
  const items = navItemsFor(user);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-68 p-4 lg:block">
      <div className="app-panel flex h-full flex-col rounded-[2rem] p-4">
        <Link to="/" className="px-2 py-2" aria-label="Naadi home">
          <BrandMark />
        </Link>
        <div className="mt-7 px-2">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted">
            {roleLabel(user.role)}
          </p>
        </div>
        <nav className="mt-3 space-y-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold text-muted transition hover:bg-primary-soft/60 hover:text-primary [&.active]:bg-primary [&.active]:text-white [&.active]:shadow-[0_10px_24px_-14px_rgba(37,99,235,.9)]"
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f5f7fc] p-3.5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-extrabold text-primary">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-primary-ink">{user.name}</p>
              <p className="truncate text-[0.68rem] text-muted">{user.email}</p>
            </div>
          </div>
          {user.role === "patient" ? (
            <div className="mt-3 rounded-xl border border-primary/10 bg-white px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-muted">
                <Fingerprint className="size-3.5 text-primary" />
                Patient UHID
              </div>
              <p
                className="mt-1 break-all font-mono text-[0.7rem] font-bold leading-5 text-primary-ink"
                title={user.uhid}
              >
                {user.uhid ?? "Loading UHID…"}
              </p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white py-2.5 text-xs font-bold text-muted transition hover:border-primary/20 hover:text-primary"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileWorkspaceChrome({ user, logout }: { user: AuthUser; logout: () => void }) {
  const items = navItemsFor(user);
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/80 bg-bg/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Naadi home">
            <BrandMark />
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl bg-white text-xs font-extrabold text-primary shadow-sm">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className="grid size-9 place-items-center rounded-xl bg-white text-muted shadow-sm"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        {user.role === "patient" ? (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-primary/10 bg-white/85 px-3 py-2 shadow-sm">
            <Fingerprint className="size-4 shrink-0 text-primary" />
            <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-wider text-muted">
              Your UHID
            </span>
            <span className="min-w-0 break-all font-mono text-[0.68rem] font-bold text-primary-ink">
              {user.uhid ?? "Loading…"}
            </span>
          </div>
        ) : null}
      </header>
      <nav className="safe-bottom fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-[1.4rem] border border-white/90 bg-[#111827]/95 px-2 pt-2 shadow-2xl backdrop-blur-xl lg:hidden">
        <Link
          to="/"
          aria-label="Naadi home"
          className="grid size-11 place-items-center rounded-xl text-slate-400 transition [&.active]:bg-white/10 [&.active]:text-white"
        >
          <Home className="size-5" />
        </Link>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className="flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[0.62rem] font-bold text-slate-400 transition [&.active]:bg-primary [&.active]:text-white"
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function RouteGate() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const requiredRole = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/provider")
      ? "provider"
      : pathname.startsWith("/patient")
        ? "patient"
        : null;
  const allowed =
    !requiredRole ||
    (requiredRole === "admin" && user?.role === "super_admin") ||
    (requiredRole === "patient" && user?.role === "patient") ||
    (requiredRole === "provider" &&
      (user?.role === "hospital_admin" || user?.role === "pharmacy_admin"));

  useEffect(() => {
    if (requiredRole && (!isAuthenticated || !allowed)) {
      void navigate({ to: "/login", replace: true });
    }
  }, [allowed, isAuthenticated, navigate, requiredRole]);

  if (requiredRole && (!isAuthenticated || !allowed)) return null;
  return <Outlet />;
}

function ShellContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const authenticated = isAuthenticated && Boolean(user);
  const currentUser = trpc.auth.me.useQuery(undefined, {
    enabled: authenticated,
    staleTime: 30_000,
  });
  const displayedUser =
    user && currentUser.data
      ? {
          ...user,
          uhid: currentUser.data.uhid ?? user.uhid,
        }
      : user;

  return (
    <div className="min-h-dvh">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[32rem] bg-hero-glow" />
      {authenticated && displayedUser ? (
        <>
          <WorkspaceSidebar user={displayedUser} logout={logout} />
          <MobileWorkspaceChrome user={displayedUser} logout={logout} />
        </>
      ) : (
        <PublicHeader />
      )}
      <div className={authenticated ? "lg:pl-68" : ""}>
        <main
          className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${
            authenticated ? "pb-28 pt-6 sm:pt-8 lg:pb-12 lg:pt-8" : "pb-12 pt-5 sm:pt-8"
          }`}
        >
          <RouteGate />
        </main>
        <footer
          className={`px-6 pb-24 pt-3 text-center text-[0.68rem] text-muted lg:pb-7 ${
            authenticated ? "" : "pb-7"
          }`}
        >
          Fictional demo data only · Not for clinical emergencies
        </footer>
      </div>
    </div>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <ShellContent />
    </AuthProvider>
  );
}
