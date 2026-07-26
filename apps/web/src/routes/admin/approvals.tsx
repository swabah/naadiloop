import { Link } from "@tanstack/react-router";
import {
  Building,
  Building2,
  CheckCircle,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { trpc } from "../../lib/trpc";

export function AdminApprovalsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const pendingQuery = trpc.admin.pendingApprovals.useQuery(undefined, {
    enabled: user?.role === "super_admin",
  });

  const approveMutation = trpc.admin.approveUser.useMutation({
    onSuccess: () => {
      utils.admin.pendingApprovals.invalidate();
    },
  });

  if (user && user.role !== "super_admin") {
    return (
      <div className="app-panel mx-auto max-w-xl rounded-3xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-primary-ink">Access restricted</h1>
        <p className="mt-2 text-sm text-muted">
          This portal is reserved for Super Admin users only.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d55d8]"
          >
            Switch account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gate/10 px-3 py-1.5 text-xs font-bold text-gate">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin portal
          </div>
          <h1 className="text-3xl font-extrabold text-primary-ink sm:text-4xl">
            Workspace approvals
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Review and approve registered Hospitals and Pharmacies before granting platform access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => pendingQuery.refetch()}
            className="h-11 rounded-2xl border border-border bg-white px-4 text-xs font-bold text-primary-ink shadow-sm transition hover:border-primary/25 hover:bg-primary-soft/40"
          >
            Refresh list
          </button>
        </div>
      </div>

      {/* Content State */}
      {approveMutation.isError ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Approval update failed: {approveMutation.error.message}
        </div>
      ) : null}
      {pendingQuery.isLoading ? (
        <div className="py-20 text-center text-sm text-muted">
          Loading pending workspace applications…
        </div>
      ) : pendingQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load pending approvals: {pendingQuery.error.message}
        </div>
      ) : !pendingQuery.data || pendingQuery.data.length === 0 ? (
        <div className="app-panel rounded-[2rem] border-dashed py-16 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-success/10 text-success-ink">
            <CheckCircle className="size-6" />
          </div>
          <h3 className="text-lg font-bold text-primary-ink">All applications processed</h3>
          <p className="mt-1 text-sm text-muted">
            There are no pending administration registration requests at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingQuery.data.map((item) => (
            <div
              key={item.id}
              className="app-panel rounded-[1.75rem] p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
            >
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
                {/* Info Column */}
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        item.role === "hospital_admin"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {item.role === "hospital_admin" ? (
                        <Building2 className="w-3.5 h-3.5" />
                      ) : (
                        <Building className="w-3.5 h-3.5" />
                      )}
                      {item.role === "hospital_admin" ? "Hospital Admin" : "Pharmacy Admin"}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      <Clock className="w-3 h-3" />
                      Pending Approval
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-primary-ink">
                      {item.organization?.orgName || item.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      License / Reg No: {item.organization?.licenseNumber || "N/A"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-2xl bg-primary-soft/35 p-4 text-xs text-text sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted shrink-0" />
                      <span>
                        <span className="font-semibold text-primary-ink">Admin:</span> {item.name} (
                        {item.email})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted shrink-0" />
                      <span>
                        <span className="font-semibold text-primary-ink">Address:</span>{" "}
                        {[
                          item.organization?.address,
                          item.organization?.city,
                          item.organization?.state,
                          item.organization?.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No address specified"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex min-w-40 items-stretch justify-end gap-3 sm:flex-row lg:flex-col">
                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ userId: item.id, action: "approve" })}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d55d8] disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ userId: item.id, action: "reject" })}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-danger/20 bg-white px-4 text-sm font-bold text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
