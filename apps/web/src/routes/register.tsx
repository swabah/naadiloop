import { Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, Clock, ShieldCheck, User, UserCheck } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

type RegisterRoleTab = "patient" | "admin";
type AdminSubRole = "hospital_admin" | "pharmacy_admin";

export function RegisterPage() {
  const [activeTab, setActiveTab] = useState<RegisterRoleTab>("patient");
  const [adminRole, setAdminRole] = useState<AdminSubRole>("hospital_admin");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    status: string;
    uhid: string | null;
  } | null>(null);

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
        uhid: data.uhid,
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

    if (targetRole === "patient" && !/^\d{12}$/.test(aadhaarNumber)) {
      setErrorMessage("Enter a valid 12-digit Aadhaar number.");
      return;
    }

    if (targetRole !== "patient") {
      if (!orgName.trim() || !licenseNumber.trim()) {
        setErrorMessage(
          "Organization name and license number are required for administration registration.",
        );
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

  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex size-13 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Join Naadi</p>
        <h1 className="mt-2 text-3xl font-extrabold text-primary-ink sm:text-4xl">
          Create your account
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
          Patients receive an independent UHID. Hospital and Pharmacy workspaces require platform
          approval.
        </p>
      </div>

      {/* Success Notification View */}
      {successInfo ? (
        <div className="app-panel rounded-[2rem] p-6 text-center sm:p-10">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success-ink">
            {successInfo.status === "active" ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <Clock className="h-8 w-8 text-amber-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-primary-ink">
            {successInfo.status === "active" ? "Registration Approved!" : "Application Submitted!"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            {successInfo.message}
          </p>
          {successInfo.uhid ? (
            <div className="mx-auto mt-5 max-w-md rounded-2xl border border-primary/15 bg-primary-soft/45 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Your unique UHID
              </p>
              <p className="mt-2 break-all font-mono text-sm font-bold text-primary-ink">
                {successInfo.uhid}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Keep this ID safe. Give it to a Hospital only when you want them to add you.
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex justify-center gap-4">
            <Link
              to="/login"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d55d8]"
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
                setAadhaarNumber("");
              }}
              className="h-11 rounded-xl border border-border bg-white px-5 text-sm font-bold text-primary-ink transition hover:border-primary/25 hover:bg-primary-soft/40"
            >
              Register another account
            </button>
          </div>
        </div>
      ) : (
        <div className="app-panel rounded-[2rem] p-5 sm:p-8">
          {/* Tab Selector */}
          <div className="mb-7 grid grid-cols-2 gap-2 rounded-2xl bg-primary-soft/65 p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("patient")}
              className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold transition-all sm:text-sm ${
                activeTab === "patient"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted hover:text-primary-ink"
              }`}
            >
              <User className="w-4 h-4" />
              Patient
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs font-bold transition-all sm:text-sm ${
                activeTab === "admin"
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted hover:text-primary-ink"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Hospital / Pharmacy
            </button>
          </div>

          {/* Tab Info Banners */}
          {activeTab === "patient" ? (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary-soft/40 p-4">
              <UserCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="text-xs leading-relaxed text-primary-ink">
                <span className="font-bold">Independent Patient identity:</span> Registration
                creates a unique UHID. You will not appear in any Hospital until you share it and
                approve the Hospital link.
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Super Admin Approval Required:</span> Hospital and
                Pharmacy administration accounts undergo manual verification before login access is
                granted.
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
                <label
                  htmlFor="register-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="register-name"
                  type="text"
                  required
                  placeholder="e.g. Rajan Menon"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="register-email"
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div>
                <label
                  htmlFor="register-phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                >
                  Phone Number{" "}
                  {activeTab === "patient" ? <span className="text-red-500">*</span> : null}
                </label>
                <input
                  id="register-phone"
                  type="tel"
                  required={activeTab === "patient"}
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            {/* Patient Fields */}
            {activeTab === "patient" && (
              <>
                <hr className="my-4 border-border" />
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="register-aadhaar"
                      className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted"
                    >
                      Aadhaar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="register-aadhaar"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                      minLength={12}
                      maxLength={12}
                      pattern="[0-9]{12}"
                      placeholder="12-digit Aadhaar number"
                      value={aadhaarNumber}
                      onChange={(event) =>
                        setAadhaarNumber(event.target.value.replace(/\D/g, "").slice(0, 12))
                      }
                      aria-describedby="register-aadhaar-help"
                      className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 font-mono text-sm font-medium tracking-wider outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                    />
                    <p id="register-aadhaar-help" className="mt-1.5 text-xs leading-5 text-muted">
                      Required for Patient registration and never displayed in Patient or Provider
                      profiles.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="register-age"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        Age
                      </label>
                      <input
                        id="register-age"
                        type="text"
                        placeholder="55"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="register-gender"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        Gender
                      </label>
                      <select
                        id="register-gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="register-language"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        Language
                      </label>
                      <select
                        id="register-language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
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
                    <p className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                      Administration Role Type <span className="text-red-500">*</span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all ${
                          adminRole === "hospital_admin"
                            ? "border-primary/40 bg-primary-soft/55 font-semibold text-primary-ink"
                            : "border-border bg-[#f9faff] text-text hover:border-primary/25"
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
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-all ${
                          adminRole === "pharmacy_admin"
                            ? "border-primary/40 bg-primary-soft/55 font-semibold text-primary-ink"
                            : "border-border bg-[#f9faff] text-text hover:border-primary/25"
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
                      <label
                        htmlFor="register-org-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        Facility / Organization Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="register-org-name"
                        type="text"
                        required
                        placeholder={
                          adminRole === "hospital_admin"
                            ? "CityCare Multispecialty Hospital"
                            : "Kerala Meds Pharmacy"
                        }
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="register-license"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        License / Registration Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="register-license"
                        type="text"
                        required
                        placeholder="e.g. HOSP-998812 / PHARM-3321"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="register-address"
                      className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                    >
                      Street Address
                    </label>
                    <input
                      id="register-address"
                      type="text"
                      placeholder="123 Health Avenue, MG Road"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="register-city"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        City
                      </label>
                      <input
                        id="register-city"
                        type="text"
                        placeholder="Kochi"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="register-state"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        State
                      </label>
                      <input
                        id="register-state"
                        type="text"
                        placeholder="Kerala"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="register-pincode"
                        className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
                      >
                        Pincode
                      </label>
                      <input
                        id="register-pincode"
                        type="text"
                        placeholder="682001"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="h-13 w-full rounded-2xl border border-border bg-[#f9faff] px-4 text-sm font-medium outline-none transition focus:border-primary/55 focus:bg-white focus:ring-4 focus:ring-primary/10"
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
                className="h-12 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,.9)] transition hover:bg-[#1d55d8] disabled:opacity-50"
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
