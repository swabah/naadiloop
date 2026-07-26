import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../lib/auth-context";
import { trpc } from "../lib/trpc";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "patient") {
        navigate({ to: "/patient/next" });
      } else if (user.role === "super_admin") {
        navigate({ to: "/admin/approvals" });
      } else {
        navigate({ to: "/provider/dashboard" });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setErrorMessage(null);
      setIsPendingApproval(false);
      login(data.token, data.user);
      if (data.user.role === "patient") {
        navigate({ to: "/patient/next" });
      } else if (data.user.role === "super_admin") {
        navigate({ to: "/admin/approvals" });
      } else {
        navigate({ to: "/provider/dashboard" });
      }
    },
    onError: (error) => {
      if (error.message.toLowerCase().includes("pending approval")) {
        setIsPendingApproval(true);
        setErrorMessage("Your organization account is waiting for approval.");
      } else {
        setIsPendingApproval(false);
        setErrorMessage(error.message || "Those credentials could not be verified.");
      }
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsPendingApproval(false);
    if (!email || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }
    loginMutation.mutate({ email, password });
  };

  return (
    <section className="mx-auto grid min-h-[calc(100dvh-10rem)] max-w-6xl items-stretch overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_28px_90px_-48px_rgba(29,55,120,.5)] lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden bg-[#dfe7ff] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="subtle-grid absolute inset-0 opacity-55" />
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 text-xs font-bold text-primary shadow-sm">
            <Sparkles className="size-4" />
            One connected Care journey
          </span>
          <h1 className="mt-8 max-w-lg text-5xl font-extrabold leading-[1.04] text-primary-ink">
            Clear next steps.
            <br />
            Care that closes the loop.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#53617f]">
            Naadi turns Provider-verified instructions into a simple daily journey for every
            Patient.
          </p>
        </div>

        <div className="relative grid gap-3">
          {[
            {
              icon: ShieldCheck,
              title: "Provider verified",
              copy: "Every Care action stays tied to its source instruction.",
            },
            {
              icon: HeartPulse,
              title: "Patient friendly",
              copy: "See what to do next without interpreting medical documents.",
            },
            {
              icon: CheckCircle2,
              title: "Loop completed",
              copy: "Reports, reviews, follow-ups, and support stay connected.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/65 p-4 backdrop-blur"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-sm">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-primary-ink">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">{item.copy}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center p-5 sm:p-10 lg:p-12 xl:p-16">
        <div className="mx-auto w-full max-w-md">
          <div className="grid size-13 place-items-center rounded-2xl bg-primary-soft text-primary lg:hidden">
            <HeartPulse className="size-6" />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Welcome back
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-primary-ink sm:text-4xl">
            Sign in to Naadi
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your role and workspace are selected automatically after sign in.
          </p>

          {isPendingApproval ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-amber-700" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Approval is still pending</h3>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    A Super Admin must approve this Hospital or Pharmacy account before it can sign
                    in.
                  </p>
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div
              className="mt-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <label className="block space-y-2" htmlFor="login-email">
              <span className="text-sm font-bold text-primary-ink">Email address</span>
              <Input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block space-y-2" htmlFor="login-password">
              <span className="text-sm font-bold text-primary-ink">Password</span>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-1 grid w-11 place-items-center rounded-xl text-muted hover:text-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <LockKeyhole className="size-4" />
              )}
              {loginMutation.isPending ? "Signing in…" : "Continue securely"}
              {!loginMutation.isPending ? <ArrowRight className="ml-auto size-4" /> : null}
            </Button>
          </form>

          <div className="mt-7 flex items-center justify-between gap-4 border-t border-border pt-5 text-xs text-muted">
            <span>New to Naadi?</span>
            <Link
              to="/register"
              className="font-bold text-primary transition hover:text-primary-ink"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
