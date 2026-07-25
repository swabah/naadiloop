import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "./components/app-shell";
import { LandingPage } from "./routes";
import { AdminApprovalsPage } from "./routes/admin/approvals";
import { LoginPage } from "./routes/login";
import { RegisterPage } from "./routes/register";
import { PatientActionPage } from "./routes/patient/action";
import { PatientHelpPage } from "./routes/patient/help";
import { PatientJourneyPage } from "./routes/patient/journey";
import { PatientNextPage } from "./routes/patient/next";
import { PatientReportPage } from "./routes/patient/report";
import { ProviderDashboardPage } from "./routes/provider/dashboard";
import { ProviderDocumentPage } from "./routes/provider/document";
import { ProviderPatientsPage } from "./routes/provider/patients";
import { ProviderReportPage } from "./routes/provider/report";
import { ProviderVerifyPage } from "./routes/provider/verify";


const rootRoute = createRootRoute({
  component: AppShell,
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

const providerDocumentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/patients/$patientId/document",
  component: ProviderDocumentPage,
});

const providerVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/provider/patients/$patientId/verify",
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
  providerDocumentRoute,
  providerVerifyRoute,
  providerDashboardRoute,
  providerReportRoute,
  patientNextRoute,
  patientJourneyRoute,
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
