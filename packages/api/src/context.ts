import { DEMO_PATIENT_ID, DEMO_PROVIDER_ID, getDb } from "@naadi/db";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export type DemoRole = "patient" | "provider";

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  patientId?: string;
}

const demoUsers: Record<DemoRole, AuthedUser> = {
  provider: {
    id: DEMO_PROVIDER_ID,
    name: "Dr. Anjali Nair",
    email: "anjali@naadi.demo",
    role: "provider",
  },
  patient: {
    id: DEMO_PATIENT_ID,
    patientId: DEMO_PATIENT_ID,
    name: "Rajan Menon",
    email: "rajan@naadi.demo",
    role: "patient",
  },
};

export function getDemoUserByRole(role: DemoRole): AuthedUser {
  return demoUsers[role];
}

export function getDemoUserByEmail(email: string): AuthedUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  return Object.values(demoUsers).find((user) => user.email === normalizedEmail) ?? null;
}

export function createContext({ req }: FetchCreateContextFnOptions) {
  const roleHeader = req.headers.get("x-demo-role");
  const role: DemoRole | null =
    roleHeader === "patient" || roleHeader === "provider" ? roleHeader : null;

  return {
    db: getDb(),
    user: role ? getDemoUserByRole(role) : null,
  };
}

export type Context = ReturnType<typeof createContext>;
