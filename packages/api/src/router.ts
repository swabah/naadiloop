import { patients } from "@naadi/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDemoUserByEmail } from "./context";
import {
  actionIdSchema,
  careActionSchema,
  careGapListSchema,
  carePlanIdSchema,
  completeActionSchema,
  documentInputSchema,
  helpRequestSchema,
  patientCreateSchema,
  patientIdSchema,
  reviewReportSchema,
  uploadReportSchema,
  verifyCarePlanSchema,
} from "./schemas";
import { protectedProcedure, providerProcedure, publicProcedure, router } from "./trpc";

function notImplemented(): never {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "This procedure is contracted in ISSUE-001 and implemented in a later issue.",
  });
}

export const appRouter = router({
  auth: router({
    login: publicProcedure
      .input(z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email.") }))
      .mutation(({ input }) => {
        const user = getDemoUserByEmail(input.email);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Use one of the seeded demo identities to continue.",
          });
        }
        return user;
      }),
    me: protectedProcedure.query(({ ctx }) => ctx.user),
  }),
  patient: router({
    list: providerProcedure.query(({ ctx }) =>
      ctx.db.query.patients.findMany({
        orderBy: (patient, { asc, desc }) => [desc(patient.createdAt), asc(patient.name)],
      }),
    ),
    create: providerProcedure.input(patientCreateSchema).mutation(async ({ ctx, input }) => {
      const [patient] = await ctx.db.insert(patients).values(input).returning();
      if (!patient) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The Patient could not be created. Please try again.",
        });
      }
      return patient;
    }),
    nextAction: protectedProcedure.input(patientIdSchema).query(notImplemented),
    journey: protectedProcedure.input(patientIdSchema).query(notImplemented),
    actionDetails: protectedProcedure.input(actionIdSchema).query(notImplemented),
    markCompleted: protectedProcedure.input(completeActionSchema).mutation(notImplemented),
    skipDose: protectedProcedure
      .input(actionIdSchema.extend({ notes: z.string().trim().max(1_000).optional() }))
      .mutation(notImplemented),
    requestHelp: protectedProcedure.input(helpRequestSchema).mutation(notImplemented),
    uploadReport: protectedProcedure.input(uploadReportSchema).mutation(notImplemented),
  }),
  document: router({
    create: protectedProcedure.input(documentInputSchema).mutation(notImplemented),
    extract: protectedProcedure
      .input(z.object({ documentId: z.string().uuid() }))
      .mutation(notImplemented),
  }),
  carePlan: router({
    verify: protectedProcedure.input(verifyCarePlanSchema).mutation(notImplemented),
    activate: protectedProcedure.input(carePlanIdSchema).mutation(notImplemented),
  }),
  provider: router({
    dashboard: protectedProcedure.query(notImplemented),
    reviewReport: protectedProcedure.input(reviewReportSchema).mutation(notImplemented),
    createFollowUp: protectedProcedure
      .input(
        z.object({
          carePlanId: z.string().uuid(),
          parentActionId: z.string().uuid().optional(),
          action: careActionSchema.refine((action) => action.type === "FOLLOW_UP", {
            message: "Follow-up action must use type FOLLOW_UP.",
          }),
        }),
      )
      .mutation(notImplemented),
    listCareGaps: protectedProcedure.input(careGapListSchema).query(notImplemented),
  }),
});

export type AppRouter = typeof appRouter;
