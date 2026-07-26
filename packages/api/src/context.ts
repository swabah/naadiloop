import { getDb, patients, users } from "@naadi/db";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

export type UserRole = "patient" | "hospital_admin" | "pharmacy_admin" | "super_admin";

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active";
  patientId?: string;
  uhid?: string;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const db = getDb();
  let user: AuthedUser | null = null;
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    try {
      const decoded = jwt.verify(token, getJwtSecret(), {
        issuer: "naadi-loop",
        audience: "naadi-loop-web",
      });
      const userId = typeof decoded === "object" ? decoded.sub : undefined;
      if (userId) {
        const record = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (record?.status === "active") {
          const patientProfile =
            record.role === "patient"
              ? await db.query.patients.findFirst({ where: eq(patients.id, record.id) })
              : null;
          user = {
            id: record.id,
            name: record.name,
            email: record.email,
            role: record.role,
            status: "active",
            patientId: record.role === "patient" ? record.id : undefined,
            uhid: patientProfile?.uhid,
          };
        }
      }
    } catch {
      user = null;
    }
  }

  return { db, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
