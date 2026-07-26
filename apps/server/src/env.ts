import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  JWT_SECRET: z.string().min(32),
  GEMINI_API_KEY: z.string().min(1),
  CORS_ALLOWED_ORIGINS: z.string().min(1),
  PORT: z.coerce.number().int().positive().max(65_535).default(3001),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  corsAllowedOrigins: parsed.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
};
