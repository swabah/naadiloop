import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please log in to continue." });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const providerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "hospital_admin" && ctx.user.role !== "pharmacy_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This workspace is available to care providers.",
    });
  }

  return next({ ctx });
});

export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access restricted to Super Admin." });
  }

  return next({
    ctx,
  });
});

export const patientProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "patient" || !ctx.user.patientId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access restricted to Patients." });
  }
  return next({ ctx });
});
