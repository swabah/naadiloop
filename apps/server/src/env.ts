import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  PORT: z.coerce.number().int().positive().max(65_535).default(3001),
});

export const env = envSchema.parse(process.env);
