import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Clock, KeyRound, LogIn } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { trpc } from "../lib/trpc";

export function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  // Auto-redirect if already logged in
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

      // Route based on role
      if (data.user.role === "patient") {
        navigate({ to: "/patient/next" });
      } else if (data.user.role === "super_admin") {
        navigate({ to: "/admin/approvals" });
      } else {
        navigate({ to: "/provider/dashboard" });
      }
    },
    onError: (err) => {
      if (err.message.toLowerCase().includes("pending approval")) {
        setIsPendingApproval(true);
        setErrorMessage("Your administration account is pending Super Admin approval.");
      } else {
        setIsPendingApproval(false);
        setErrorMessage(err.message || "Invalid credentials.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPendingApproval(false);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="mx-auto max-w-md py-10 px-4">
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-primary-ink font-display">Sign In</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your credentials to access the portal assigned to your account.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Pending Approval Error Alert */}
        {isPendingApproval ? (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Account Pending Super Admin Approval
                </h3>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  Your registration application for a Hospital or Pharmacy administration account
                  has been received and is waiting for Super Admin review. You will be able to sign
                  in once approved.
                </p>
              </div>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow hover:bg-primary-ink transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-muted">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
