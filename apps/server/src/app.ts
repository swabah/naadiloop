import { trpcServer } from "@hono/trpc-server";
import { appRouter, createContext } from "@naadi/api";
import { getDb, users } from "@naadi/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env";

export const app = new Hono();

app.use(
  "/trpc/*",
  cors({
    origin: (origin) => (env.corsAllowedOrigins.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
    allowMethods: ["GET", "POST", "OPTIONS", "HEAD"],
    credentials: true,
  }),
);

app.get("/health", (context) =>
  context.json({
    service: "naadi-loop-server",
    status: "ok",
  }),
);

app.get("/ready", async (context) => {
  try {
    await getDb().select({ id: users.id }).from(users).limit(1);
    return context.json({ service: "naadi-loop-server", status: "ready" });
  } catch {
    return context.json({ service: "naadi-loop-server", status: "unavailable" }, 503);
  }
});

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  }),
);
