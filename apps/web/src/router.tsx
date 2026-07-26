import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "./components/app-shell";

const LandingPage = lazyRouteComponent(() => import("./routes"), "LandingPage");
const LoginPage = lazyRouteComponent(() => import("./routes/login"), "LoginPage");
const RegisterPage = lazyRouteComponent(() => import("./routes/register"), "RegisterPage");
const AdminApprovalsPage = lazyRouteComponent(
  () => import("./routes/admin/approvals"),
  "AdminApprovalsPage",
);
const PatientActionPage = lazyRouteComponent(
  () => import("./routes/patient/action"),
  "PatientActionPage",
);
const PatientHelpPage = lazyRouteComponent(
  () => import("./routes/patient/help"),
  "PatientHelpPage",
);
const PatientJourneyPage = lazyRouteComponent(
  () => import("./routes/patient/journey"),
  "PatientJourneyPage",
);
const PatientNextPage = lazyRouteComponent(
  () => import("./routes/patient/next"),
  "PatientNextPage",
);
const PatientProfilePage = lazyRouteComponent(
  () => import("./routes/patient/profile"),
  "PatientProfilePage",
);
const PatientReportPage = lazyRouteComponent(
  () => import("./routes/patient/report"),
  "PatientReportPage",
);
const ProviderDashboardPage = lazyRouteComponent(
  () => import("./routes/provider/dashboard"),
  "ProviderDashboardPage",
);
const ProviderDocumentPage = lazyRouteComponent(
  () => import("./routes/provider/document"),
  "ProviderDocumentPage",
);
const ProviderPatientsPage = lazyRouteComponent(
  () => import("./routes/provider/patients"),
  "ProviderPatientsPage",
);
const ProviderPatientPage = lazyRouteComponent(
  () => import("./routes/provider/patient"),
  "ProviderPatientPage",
);
const ProviderReportPage = lazyRouteComponent(
  () => import("./routes/provider/report"),
  "ProviderReportPage",
);
const ProviderVerifyPage = lazyRouteComponent(
  () => import("./routes/provider/verify"),
  "ProviderVerifyPage",
);

const rootRoute = createRootRoute({
  component: AppShell,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-xl py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-danger">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-bold text-primary-ink">This page could not be loaded.</h1>
      <p className="mt-4 text-sm text-text-muted">
        {error instanceof Error ? error.message : "An unexpected application error occurred."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          className="rounded-xl bg-primary px-5 py-3 font-bold text-white"
          onClick={reset}
        >
          Try again
        </button>
        <a className="rounded-xl border border-border px-5 py-3 font-bold text-primary" href="/">
          Return home
        </a>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-wider text-primary">404</p>
      <h1 className="mt-3 text-3xl font-bold text-primary-ink">This care route does not exist.</h1>
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const providerPatientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/patients",
  component: ProviderPatientsPage,
});

const providerPatientRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/patients/$patientId",
  component: ProviderPatientPage,
});

const providerDocumentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/patients/$patientId/document",
  component: ProviderDocumentPage,
});

const providerVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/patients/$patientId/verify",
  validateSearch: z.object({
    carePlanId: z.string().uuid().optional(),
    manual: z.coerce.boolean().optional().default(false),
  }),
  component: ProviderVerifyPage,
});

const providerDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/dashboard",
  component: ProviderDashboardPage,
});

const providerReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/reports/$reportId",
  component: ProviderReportPage,
});

const patientNextRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/patient/next",
  component: PatientNextPage,
});

const patientJourneyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/patient/journey",
  component: PatientJourneyPage,
});

const patientProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/patient/profile",
  component: PatientProfilePage,
});

const patientActionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/patient/actions/$actionId",
  component: PatientActionPage,
});

const patientReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/patient/actions/$actionId/report",
  component: PatientReportPage,
});

const patientHelpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/patient/help",
  validateSearch: z.object({
    actionId: z.string().uuid().optional(),
  }),
  component: PatientHelpPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const adminApprovalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/approvals",
  component: AdminApprovalsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  registerRoute,
  loginRoute,
  adminApprovalsRoute,
  providerPatientsRoute,
  providerPatientRoute,
  providerDocumentRoute,
  providerVerifyRoute,
  providerDashboardRoute,
  providerReportRoute,
  patientNextRoute,
  patientJourneyRoute,
  patientProfileRoute,
  patientActionRoute,
  patientReportRoute,
  patientHelpRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
