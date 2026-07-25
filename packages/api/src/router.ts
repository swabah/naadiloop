import { type ExtractedCareAction, extractCareActions } from "@naadi/ai";
import { careActions, carePlans, patients, sourceDocuments } from "@naadi/db";
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
    create: providerProcedure.input(documentInputSchema).mutation(async ({ ctx, input }) => {
      const patient = await ctx.db.query.patients.findFirst({
        where: (record, { eq }) => eq(record.id, input.patientId),
      });
      if (!patient) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "The selected Patient could not be found.",
        });
      }

      const [document] = await ctx.db
        .insert(sourceDocuments)
        .values({
          patientId: input.patientId,
          documentType: input.type,
          content: input.content,
        })
        .returning();
      if (!document) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The medical instructions could not be saved.",
        });
      }
      return document;
    }),
    extract: providerProcedure
      .input(z.object({ documentId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const document = await ctx.db.query.sourceDocuments.findFirst({
          where: (record, { eq }) => eq(record.id, input.documentId),
        });
        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The source document could not be found.",
          });
        }

        const patient = await ctx.db.query.patients.findFirst({
          where: (record, { eq }) => eq(record.id, document.patientId),
        });
        if (!patient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The Patient for this source document could not be found.",
          });
        }

        let extracted: ExtractedCareAction[];
        try {
          extracted = await extractCareActions({ sourceText: document.content });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message:
              error instanceof Error
                ? error.message
                : "The document could not be extracted. Please retry or enter actions manually.",
            cause: error,
          });
        }

        const [carePlan] = await ctx.db
          .insert(carePlans)
          .values({
            patientId: document.patientId,
            providerId: ctx.user.id,
            status: "draft",
          })
          .returning();
        if (!carePlan) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "A draft Care plan could not be created.",
          });
        }

        const actions = await ctx.db
          .insert(careActions)
          .values(
            extracted.map((action) => ({
              carePlanId: carePlan.id,
              type: action.type,
              title: action.title,
              instructions: action.instructions,
              dueDate: action.dueDate ? new Date(action.dueDate) : undefined,
              priority: action.priority,
              sourceText: action.sourceText,
              assignedTo: "patient",
              reviewRequired: action.type === "TEST" || action.type === "REFERRAL",
              verified: false,
              payload: {},
            })),
          )
          .returning();

        return {
          document: {
            ...document,
            uploadedAt: document.uploadedAt.toISOString(),
          },
          patient: {
            id: patient.id,
            name: patient.name,
          },
          carePlan: {
            id: carePlan.id,
            patientId: carePlan.patientId,
            providerId: carePlan.providerId,
            status: "draft" as const,
            createdAt: carePlan.createdAt.toISOString(),
          },
          actions: actions.map((action) => ({
            ...action,
            dueDate: action.dueDate?.toISOString(),
            createdAt: action.createdAt.toISOString(),
          })),
        };
      }),
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
