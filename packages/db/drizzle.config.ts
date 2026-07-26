import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { withStrictPostgresSslMode } from "./src/connection-string";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL is required for Drizzle schema commands.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url: withStrictPostgresSslMode(url) },
  strict: true,
  verbose: true,
});
