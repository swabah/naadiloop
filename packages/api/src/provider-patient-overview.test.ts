import assert from "node:assert/strict";
import test from "node:test";
import type { Context } from "./context";
import { appRouter } from "./router";

const patientId = "20000000-0000-4000-8000-000000000001";

test("Provider Patient overview rejects an unassigned Patient", async () => {
  const db = {
    query: {
      providerPatientAssignments: {
        findFirst: async () => undefined,
      },
    },
  } as unknown as Context["db"];
  const caller = appRouter.createCaller({
    db,
    user: {
      id: "10000000-0000-4000-8000-000000000099",
      name: "Other Provider",
      email: "other-provider@example.test",
      role: "hospital_admin",
      status: "active",
    },
  });

  await assert.rejects(
    caller.provider.patientOverview({ patientId }),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "FORBIDDEN" &&
      error.message.includes("not assigned"),
  );
});

test("Patient accounts cannot call the Provider Patient overview", async () => {
  const caller = appRouter.createCaller({
    db: {} as Context["db"],
    user: {
      id: patientId,
      patientId,
      name: "Patient",
      email: "patient@example.test",
      role: "patient",
      status: "active",
    },
  });

  await assert.rejects(
    caller.provider.patientOverview({ patientId }),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "FORBIDDEN",
  );
});
