import jwt from "jsonwebtoken";
import { DEMO_PATIENT_ID, DEMO_PROVIDER_ID, getDb } from "@naadi/db";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export type UserRole = "patient" | "hospital_admin" | "pharmacy_admin" | "super_admin" | "provider";

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  patientId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-naadi-jwt-key-2026";

type DemoRole = "provider" | "patient";

const demoUsers: Record<DemoRole, AuthedUser> = {
  provider: {
    id: DEMO_PROVIDER_ID,
    name: "Dr. Anjali Nair",
    email: "anjali@naadi.demo",
    role: "hospital_admin",
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
  let user: AuthedUser | null = null;

  // 1. Try JWT Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthedUser;
      if (decoded && decoded.id) {
        user = {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
          status: decoded.status,
          patientId: decoded.patientId || (decoded.role === "patient" ? decoded.id : undefined),
        };
      }
    } catch {
      // Invalid JWT token -> fallback to demo role or null
    }
  }

  // 2. Fallback to demo role header if no valid JWT
  if (!user) {
    const roleHeader = req.headers.get("x-demo-role");
    const demoRole = roleHeader === "patient" || roleHeader === "provider" ? roleHeader : null;
    if (demoRole) {
      user = demoUsers[demoRole];
    }
  }

  return {
    db: getDb(),
    user,
  };
}

export type Context = ReturnType<typeof createContext>;

