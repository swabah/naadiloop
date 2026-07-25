import { trpcServer } from "@hono/trpc-server";
import { appRouter, createContext } from "@naadi/api";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const app = new Hono();

app.use(
  "/trpc/*",
  cors({
    origin: (origin) => origin || "*",
    allowHeaders: ["Content-Type", "Authorization", "x-demo-role", "x-trpc-source"],
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

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext,
  }),
);
