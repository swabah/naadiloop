import React, { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, CheckCircle2, Clock, ShieldCheck, User, UserCheck } from "lucide-react";
import { trpc } from "../lib/trpc";

type RegisterRoleTab = "patient" | "admin";
type AdminSubRole = "hospital_admin" | "pharmacy_admin";

export function RegisterPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RegisterRoleTab>("patient");
  const [adminRole, setAdminRole] = useState<AdminSubRole>("hospital_admin");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; status: string } | null>(null);

  // Common Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Patient Form State
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [language, setLanguage] = useState("en");

  // Administration Form State
  const [orgName, setOrgName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      setErrorMessage(null);
      setSuccessInfo({
        message: data.message,
        status: data.status,
      });
    },
    onError: (err) => {
      setErrorMessage(err.message || "Registration failed. Please check your inputs.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const targetRole = activeTab === "patient" ? "patient" : adminRole;

    if (targetRole === "patient") {
      const cleanAadhaar = aadhaarNumber.replace(/\s+/g, "");
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        setErrorMessage("Please enter a valid 12-digit Aadhaar number.");
        return;
      }
    } else {
      if (!orgName.trim() || !licenseNumber.trim()) {
        setErrorMessage("Organization name and license number are required for administration registration.");
        return;
      }
    }

    registerMutation.mutate({
      name,
      email,
      password,
      phone: phone || undefined,
      role: targetRole,
      aadhaarNumber: targetRole === "patient" ? aadhaarNumber : undefined,
      age: targetRole === "patient" ? age : undefined,
      gender: targetRole === "patient" ? gender : undefined,
      language: targetRole === "patient" ? language : "en",
      orgName: targetRole !== "patient" ? orgName : undefined,
      licenseNumber: targetRole !== "patient" ? licenseNumber : undefined,
      address: targetRole !== "patient" ? address : undefined,
      city: targetRole !== "patient" ? city : undefined,
      state: targetRole !== "patient" ? state : undefined,
      pincode: targetRole !== "patient" ? pincode : undefined,
    });
  };

  const formatAadhaar = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 12);
    const parts = raw.match(/.{1,4}/g);
    return parts ? parts.join(" ") : raw;
  };

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-primary-ink font-display">Create Your Account</h1>
        <p className="mt-2 text-sm text-muted">
          Register as a Patient for instant care access or as an Administration user (Hospital/Pharmacy) pending Super Admin approval.
        </p>
      </div>

      {/* Success Notification View */}
      {successInfo ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/75 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700 mb-4">
            {successInfo.status === "active" ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <Clock className="h-8 w-8 text-amber-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-teal-900">
            {successInfo.status === "active" ? "Registration Approved!" : "Application Submitted!"}
          </h2>
          <p className="mt-3 text-sm text-teal-800 leading-relaxed max-w-md mx-auto">
            {successInfo.message}
          </p>

          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-ink transition-colors"
            >
              Proceed to Login
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessInfo(null);
                setName("");
                setEmail("");
                setPassword("");
              }}
              className="rounded-xl border border-teal-300 px-5 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-100/50"
            >
              Register Another Account
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100/80 p-1 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("patient")}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "patient"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted hover:text-primary-ink"
              }`}
            >
              <User className="w-4 h-4" />
              Patient Registration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "admin"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted hover:text-primary-ink"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Administration Registration
            </button>
          </div>

          {/* Tab Info Banners */}
          {activeTab === "patient" ? (
            <div className="mb-6 rounded-lg bg-teal-50 border border-teal-200 p-3.5 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-teal-700 mt-0.5 shrink-0" />
              <div className="text-xs text-teal-800 leading-relaxed">
                <span className="font-bold">Instant Activation:</span> Patient accounts require a 12-digit Aadhaar number for unique verification and are auto-approved instantly.
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Super Admin Approval Required:</span> Hospital and Pharmacy administration accounts undergo manual verification before login access is granted.
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Common Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajan Menon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Patient Fields */}
            {activeTab === "patient" && (
              <>
                <hr className="my-4 border-gray-100" />
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                      Aadhaar Number (12 Digits) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="1234 5678 9012"
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(formatAadhaar(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono tracking-widest focus:border-primary focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-muted">
                      Unique national health identification key used for patient deduplication.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        Age
                      </label>
                      <input
                        type="text"
                        placeholder="55"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      >
                        <option value="en">English</option>
                        <option value="ml">Malayalam (മലയാളം)</option>
                        <option value="hi">Hindi (हिंदी)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Administration Fields */}
            {activeTab === "admin" && (
              <>
                <hr className="my-4 border-gray-100" />
                <div className="space-y-4">
                  {/* Admin Role Picker */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                      Administration Role Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          adminRole === "hospital_admin"
                            ? "border-primary bg-primary/5 text-primary-ink font-semibold"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="adminRole"
                          value="hospital_admin"
                          checked={adminRole === "hospital_admin"}
                          onChange={() => setAdminRole("hospital_admin")}
                          className="accent-primary"
                        />
                        <div>
                          <div className="text-sm">Hospital Admin</div>
                          <div className="text-xs text-muted font-normal">Clinics & Hospitals</div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          adminRole === "pharmacy_admin"
                            ? "border-primary bg-primary/5 text-primary-ink font-semibold"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="adminRole"
                          value="pharmacy_admin"
                          checked={adminRole === "pharmacy_admin"}
                          onChange={() => setAdminRole("pharmacy_admin")}
                          className="accent-primary"
                        />
                        <div>
                          <div className="text-sm">Pharmacy Admin</div>
                          <div className="text-xs text-muted font-normal">Medical Outlets</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        Facility / Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          adminRole === "hospital_admin"
                            ? "CityCare Multispecialty Hospital"
                            : "Kerala Meds Pharmacy"
                        }
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        License / Registration Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HOSP-998812 / PHARM-3321"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="123 Health Avenue, MG Road"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="Kochi"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        placeholder="Kerala"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        placeholder="682001"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow hover:bg-primary-ink transition-colors disabled:opacity-50"
              >
                {registerMutation.isPending ? "Creating Account..." : "Complete Registration"}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in here
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
