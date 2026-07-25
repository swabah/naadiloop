import { trpcServer } from "@hono/trpc-server";
import { appRouter, createContext } from "@naadi/api";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const app = new Hono();

app.use(
  "/trpc/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowHeaders: ["Content-Type", "x-demo-role"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (context) =>
  context.json({
    service: "naadi-loop-server",
    status: "ok",
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  }),
);
