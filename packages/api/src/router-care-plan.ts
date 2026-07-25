import { actionEvents, careActions, carePlans, patients, sourceDocuments } from "@naadi/db";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { sourceTextAppearsIn } from "./care-plan/source-text";
import {
  careActionSchema,
  carePlanIdSchema,
  documentExtractionResultSchema,
  verifyCarePlanSchema,
} from "./schemas";
import { protectedProcedure, providerProcedure, router } from "./trpc";

function ensureProvider(
  user: { id: string; role: string } | null | undefined,
): asserts user is { id: string; role: string } {
  if (user?.role !== "provider") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Switch to the Provider demo view to manage Care plans.",
    });
  }
}

const actionInsertValues = (carePlanId: string, actions: z.infer<typeof careActionSchema>[]) =>
  actions.map((action) => ({
    carePlanId,
    type: action.type,
    title: action.title,
    instructions: action.instructions,
    dueDate: action.dueDate ? new Date(action.dueDate) : null,
    priority: action.priority,
    sourceText: action.sourceText,
    assignedTo: action.assignedTo,
    reviewRequired: action.reviewRequired,
    verified: true,
    payload: action.payload ?? {},
  }));

export const carePlanRouter = router({
  getDraft: protectedProcedure
    .input(z.object({ carePlanId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.query.carePlans.findFirst({
        where: eq(carePlans.id, input.carePlanId),
      });
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Care plan not found." });
      }
      const actions = await ctx.db
        .select()
        .from(careActions)
        .where(eq(careActions.carePlanId, plan.id))
        .orderBy(desc(careActions.createdAt));
      let sourceContent: string | null = null;
      if (plan.sourceDocumentId) {
        const doc = await ctx.db.query.sourceDocuments.findFirst({
          where: eq(sourceDocuments.id, plan.sourceDocumentId),
        });
        sourceContent = doc?.content ?? null;
      }
      return { plan, actions, sourceContent };
    }),

  commitDraft: providerProcedure
    .input(documentExtractionResultSchema)
    .mutation(async ({ ctx, input }) => {
      ensureProvider(ctx.user);
      const providerId = ctx.user.id;
      return ctx.db.transaction(async (tx) => {
        const patient = await tx.query.patients.findFirst({
          where: eq(patients.id, input.patient.id),
        });
        if (!patient) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found." });
        }
        const [doc] = await tx
          .insert(sourceDocuments)
          .values({
            patientId: input.document.patientId,
            documentType: input.document.documentType,
            content: input.document.content,
          })
          .returning();
        if (!doc) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Source document could not be saved.",
          });
        }
        for (const action of input.actions) {
          if (!sourceTextAppearsIn(action.sourceText, doc.content)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Action "${action.title}" has sourceText that does not appear in the source document.`,
            });
          }
        }
        const [plan] = await tx
          .insert(carePlans)
          .values({
            patientId: input.carePlan.patientId,
            providerId,
            sourceDocumentId: doc.id,
            status: "verified",
            verifiedAt: new Date(),
          })
          .returning();
        if (!plan) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Care plan could not be created.",
          });
        }
        const inserted = await tx
          .insert(careActions)
          .values(actionInsertValues(plan.id, input.actions))
          .returning();
        if (inserted.length !== input.actions.length) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Not all care actions were saved.",
          });
        }
        await tx.insert(actionEvents).values(
          inserted.map((row) => ({
            careActionId: row.id,
            eventType: "verified" as const,
            createdBy: "provider",
            notes: "Verified by the Provider before activation.",
          })),
        );
        return { plan, actions: inserted, sourceContent: doc.content };
      });
    }),

  verify: providerProcedure.input(verifyCarePlanSchema).mutation(async ({ ctx, input }) => {
    ensureProvider(ctx.user);
    const parsed = z.array(careActionSchema).min(1).max(50).safeParse(input.actions);
    if (!parsed.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: parsed.error.issues[0]?.message ?? "Invalid care action set.",
      });
    }
    const actions = parsed.data;
    return ctx.db.transaction(async (tx) => {
      const [plan] = await tx.select().from(carePlans).where(eq(carePlans.id, input.carePlanId));
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Care plan not found." });
      }
      if (plan.status !== "draft" && plan.status !== "verified") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Care plan cannot be edited after it is ${plan.status}.`,
        });
      }
      if (!plan.sourceDocumentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Care plan has no source document to verify against.",
        });
      }
      const [doc] = await tx
        .select({ content: sourceDocuments.content })
        .from(sourceDocuments)
        .where(eq(sourceDocuments.id, plan.sourceDocumentId));
      if (!doc) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source document for this care plan is missing.",
        });
      }
      for (const action of actions) {
        if (!sourceTextAppearsIn(action.sourceText, doc.content)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Action "${action.title}" has sourceText that does not appear in the source document.`,
          });
        }
      }
      await tx.delete(careActions).where(eq(careActions.carePlanId, plan.id));
      const inserted = await tx
        .insert(careActions)
        .values(actionInsertValues(plan.id, actions))
        .returning();
      if (inserted.length !== actions.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Not all care actions were saved.",
        });
      }
      await tx.insert(actionEvents).values(
        inserted.map((row) => ({
          careActionId: row.id,
          eventType: "verified" as const,
          createdBy: "provider",
          notes: "Verified by the Provider before activation.",
        })),
      );
      const [updated] = await tx
        .update(carePlans)
        .set({ status: "verified", verifiedAt: new Date() })
        .where(eq(carePlans.id, plan.id))
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Care plan could not be marked verified.",
        });
      }
      return { plan: updated, actions: inserted };
    });
  }),

  activate: providerProcedure.input(carePlanIdSchema).mutation(async ({ ctx, input }) => {
    ensureProvider(ctx.user);
    const providerId = ctx.user.id;
    return ctx.db.transaction(async (tx) => {
      const [plan] = await tx.select().from(carePlans).where(eq(carePlans.id, input.carePlanId));
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Care plan not found." });
      }
      if (plan.providerId !== providerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the Provider that owns this care plan can activate it.",
        });
      }
      if (plan.status !== "verified") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Care plan must be verified before activation (current: ${plan.status}).`,
        });
      }
      const actions = await tx
        .select()
        .from(careActions)
        .where(eq(careActions.carePlanId, plan.id));
      if (actions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Care plan has no care actions to activate.",
        });
      }
      const unverified = actions.filter((a) => !a.verified);
      if (unverified.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${unverified.length} care action(s) are not verified and cannot be activated.`,
        });
      }
      const [updated] = await tx
        .update(carePlans)
        .set({ status: "active" })
        .where(eq(carePlans.id, plan.id))
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Care plan could not be activated.",
        });
      }
      await tx
        .update(careActions)
        .set({ status: "PENDING" })
        .where(
          and(
            eq(careActions.carePlanId, plan.id),
            inArray(
              careActions.id,
              actions.map((a) => a.id),
            ),
          ),
        );
      await tx.insert(actionEvents).values(
        actions.map((row) => ({
          careActionId: row.id,
          eventType: "activated" as const,
          createdBy: "provider",
          notes: "Care plan activated by the Provider.",
        })),
      );
      return { plan: updated, actions };
    });
  }),
});
