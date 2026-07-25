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
      <div className="mx-auto max-w-xl py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Access Restricted</h1>
        <p className="mt-2 text-sm text-gray-600">
          This portal is reserved for Super Admin users only.
        </p>
        <div className="mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-ink"
          >
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-10 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin Portal
          </div>
          <h1 className="text-3xl font-extrabold text-primary-ink font-display">
            Pending Administration Approvals
          </h1>
          <p className="mt-1 text-sm text-muted">
            Review and approve registered Hospitals and Pharmacies before granting platform access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => pendingQuery.refetch()}
            className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Refresh List
          </button>
        </div>
      </div>

      {/* Content State */}
      {pendingQuery.isLoading ? (
        <div className="py-20 text-center text-sm text-muted">
          Loading pending administration applications...
        </div>
      ) : pendingQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load pending approvals: {pendingQuery.error.message}
        </div>
      ) : !pendingQuery.data || pendingQuery.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">All Applications Processed</h3>
          <p className="mt-1 text-sm text-muted">
            There are no pending administration registration requests at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingQuery.data.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Info Column */}
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
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
                    <h2 className="text-xl font-bold text-gray-900">
                      {item.organization?.orgName || item.name}
                    </h2>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      License / Reg No: {item.organization?.licenseNumber || "N/A"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 bg-gray-50 rounded-xl p-3.5">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted shrink-0" />
                      <span>
                        <span className="font-semibold text-gray-900">Admin:</span> {item.name} (
                        {item.email})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted shrink-0" />
                      <span>
                        <span className="font-semibold text-gray-900">Address:</span>{" "}
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
                <div className="flex sm:flex-row lg:flex-col items-stretch gap-3 min-w-[160px] justify-end">
                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ userId: item.id, action: "approve" })}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate({ userId: item.id, action: "reject" })}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
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
