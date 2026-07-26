import { fileURLToPath } from "node:url";
import { DEMO_PATIENT_ID, DEMO_PROVIDER_ID, getDb, users } from "@naadi/db";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { appRouter } from "./router";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const db = getDb();
const provider = await db.query.users.findFirst({ where: eq(users.id, DEMO_PROVIDER_ID) });
if (provider?.status !== "active" || provider.role !== "hospital_admin") {
  throw new Error("Seeded Hospital Provider is unavailable.");
}

const caller = appRouter.createCaller({
  db,
  user: {
    id: provider.id,
    email: provider.email,
    name: provider.name,
    role: provider.role,
    status: "active",
  },
});
const overview = await caller.provider.patientOverview({ patientId: DEMO_PATIENT_ID });

if (overview.summary.activeJourneys < 1) throw new Error("Active journey is missing.");
if (overview.summary.drafts < 1) throw new Error("Draft Care plan is missing.");
if (overview.summary.awaitingReview < 1) throw new Error("Awaiting-review report is missing.");
if (overview.summary.closedActions < 1) throw new Error("Closed Care history is missing.");
if (!overview.carePlans.some((plan) => plan.status === "closed")) {
  throw new Error("Closed Care plan is missing.");
}
if (
  overview.carePlans.some(
    (plan) => plan.document && ("content" in plan.document || "passwordHash" in plan.document),
  )
) {
  throw new Error("Patient overview exposed a sensitive field.");
}

console.log("Provider Patient overview seed smoke test passed.");
