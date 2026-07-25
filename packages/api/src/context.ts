import jwt from "jsonwebtoken";
import { getDb } from "@naadi/db";
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


  return {
    db: getDb(),
    user,
  };
}

export type Context = ReturnType<typeof createContext>;

