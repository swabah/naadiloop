import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import pg from "pg";
import { withStrictPostgresSslMode } from "./connection-string";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

let database: Database | undefined;
let pgliteInstance: PGlite | undefined;

export function getDb(databaseUrl = process.env.DATABASE_URL) {
  if (database) return database;

  if (
    databaseUrl &&
    (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://"))
  ) {
    const pool = new pg.Pool({ connectionString: withStrictPostgresSslMode(databaseUrl) });
    database = drizzlePg(pool, { schema }) as unknown as Database;
  } else {
    pgliteInstance ??= new PGlite(process.env.PGLITE_DATA_DIR ?? "memory://");
    database = drizzlePglite({ client: pgliteInstance, schema }) as unknown as Database;
  }

  return database;
}
