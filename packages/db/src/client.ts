import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let database: NeonHttpDatabase<typeof schema> | undefined;

export function getDb(databaseUrl = process.env.DATABASE_URL): NeonHttpDatabase<typeof schema> {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to Neon.");
  }

  database ??= drizzle(neon(databaseUrl), { schema });
  return database;
}
