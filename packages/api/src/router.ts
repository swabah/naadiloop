import { type ExtractedCareAction, extractCareActions } from "@naadi/ai";
import {
  actionEvents,
  careActions,
  carePlans,
  type getDb,
  patients,
  reports,
  sourceDocuments,
} from "@naadi/db";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { patientOutcomeTransition, reportUploadTransition } from "./action-transitions";
import { dashboardSectionFor, evaluateCareGaps } from "./care-gaps";
import { canCloseAction } from "./closure-policy";
import { getDemoUserByEmail } from "./context";
import {
  type PatientActionRecord,
  projectPatientJourney,
  selectNextPatientAction,
} from "./patient-actions";
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

function assertPatientAccess(user: { role: string; patientId?: string }, patientId: string) {
  if (user.role === "patient" && user.patientId !== patientId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Care journey belongs to another Patient.",
    });
  }
}

async function getVisiblePatientActions(db: ReturnType<typeof getDb>, patientId: string) {
  return db
    .select({ action: careActions })
    .from(careActions)
    .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
    .where(
      and(
        eq(carePlans.patientId, patientId),
        eq(carePlans.status, "active"),
        eq(careActions.verified, true),
      ),
    )
    .orderBy(asc(careActions.createdAt), asc(careActions.id))
    .then((rows) => rows.map((row) => row.action));
}

async function getVisiblePatientActionForMutation(db: ReturnType<typeof getDb>, actionId: string) {
  const [row] = await db
    .select({ action: careActions, plan: carePlans, patient: patients })
    .from(careActions)
    .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
    .innerJoin(patients, eq(carePlans.patientId, patients.id))
    .where(
      and(
        eq(careActions.id, actionId),
        eq(careActions.verified, true),
        eq(carePlans.status, "active"),
      ),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This Care action is not available in the active journey.",
    });
  }
  return row;
}

async function rejectRecentDuplicateEvent(
  db: ReturnType<typeof getDb>,
  actionId: string,
  event: "skipped" | "reminder_requested" | "help_requested",
) {
  const [latest] = await db
    .select({ eventType: actionEvents.eventType, timestamp: actionEvents.timestamp })
    .from(actionEvents)
    .where(eq(actionEvents.careActionId, actionId))
    .orderBy(desc(actionEvents.timestamp))
    .limit(1);

  if (latest?.eventType === event && Date.now() - latest.timestamp.getTime() < 10_000) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That update was already recorded. Wait a moment before recording another outcome.",
    });
  }
}

function serializePatientAction<
  T extends PatientActionRecord & {
    [key: string]: unknown;
    dueDate: Date | null;
    createdAt: Date;
  },
>(action: T) {
  return {
    ...action,
    dueDate: action.dueDate?.toISOString(),
    createdAt: action.createdAt.toISOString(),
  };
}

async function buildProviderDashboard(db: ReturnType<typeof getDb>, patientId?: string) {
  const now = new Date();
  const rows = await db
    .select({ action: careActions, patient: patients })
    .from(careActions)
    .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
    .innerJoin(patients, eq(carePlans.patientId, patients.id))
    .where(
      and(
        eq(carePlans.status, "active"),
        eq(careActions.verified, true),
        patientId ? eq(patients.id, patientId) : undefined,
      ),
    )
    .orderBy(asc(careActions.dueDate), asc(careActions.createdAt));

  const actionItems = await Promise.all(
    rows.map(async (row) => {
      const [actionReports, events] = await Promise.all([
        db
          .select({ id: reports.id, status: reports.status })
          .from(reports)
          .where(eq(reports.careActionId, row.action.id)),
        db
          .select({
            id: actionEvents.id,
            eventType: actionEvents.eventType,
            timestamp: actionEvents.timestamp,
            notes: actionEvents.notes,
          })
          .from(actionEvents)
          .where(eq(actionEvents.careActionId, row.action.id)),
      ]);
      const gaps = evaluateCareGaps(
        {
          action: {
            id: row.action.id,
            type: row.action.type,
            status: row.action.status,
            dueDate: row.action.dueDate,
          },
          reports: actionReports,
          events,
        },
        now,
      );
      const section = dashboardSectionFor(gaps);
      const primaryGap =
        gaps.find((gap) =>
          section === "requiresAttention"
            ? gap.rule === "CG-4" || gap.rule === "CG-5"
            : section === "awaitingReview"
              ? gap.rule === "CG-2"
              : section === "overdue"
                ? gap.rule === "CG-3" || gap.rule === "CG-1"
                : false,
        ) ?? gaps[0];
      return {
        id: row.action.id,
        actionId: row.action.id,
        patient: { id: row.patient.id, name: row.patient.name },
        title: row.action.title,
        type: row.action.type,
        status: row.action.status,
        dueDate: row.action.dueDate?.toISOString() ?? null,
        section,
        gaps,
        reason: primaryGap?.reason ?? "Care action is progressing without a current gap.",
        nextProviderAction:
          primaryGap?.nextProviderAction ?? "No Provider action is currently required.",
        reportId: gaps.find((gap) => gap.reportId)?.reportId ?? null,
      };
    }),
  );

  const patientHelpRows = await db
    .select({ event: actionEvents, patient: patients })
    .from(actionEvents)
    .innerJoin(patients, eq(actionEvents.patientId, patients.id))
    .where(
      and(
        isNull(actionEvents.careActionId),
        eq(actionEvents.eventType, "help_requested"),
        patientId ? eq(patients.id, patientId) : undefined,
      ),
    )
    .orderBy(desc(actionEvents.timestamp));

  const patientHelpItems = patientHelpRows.map((row) => ({
    id: row.event.id,
    actionId: null,
    patient: { id: row.patient.id, name: row.patient.name },
    title: "Patient support request",
    type: null,
    status: null,
    dueDate: null,
    section: "requiresAttention" as const,
    gaps: [
      {
        rule: "CG-4" as const,
        reason: row.event.notes ?? "Patient requested support.",
        nextProviderAction: "Respond to the Patient's support request.",
      },
    ],
    reason: row.event.notes ?? "Patient requested support.",
    nextProviderAction: "Respond to the Patient's support request.",
    reportId: null,
  }));

  const items = [...actionItems, ...patientHelpItems];
  return {
    generatedAt: now.toISOString(),
    items,
    sections: {
      requiresAttention: items.filter((item) => item.section === "requiresAttention"),
      awaitingReview: items.filter((item) => item.section === "awaitingReview"),
      overdue: items.filter((item) => item.section === "overdue"),
      onTrack: items.filter((item) => item.section === "onTrack"),
    },
  };
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
    nextAction: protectedProcedure.input(patientIdSchema).query(async ({ ctx, input }) => {
      assertPatientAccess(ctx.user, input.patientId);
      const now = new Date();
      const visibleActions = await getVisiblePatientActions(ctx.db, input.patientId);
      const projected = projectPatientJourney(visibleActions, now);
      const next = selectNextPatientAction(visibleActions, now);
      const nextProjected = next
        ? projected.actions.find((action) => action.id === next.id)
        : undefined;

      return {
        action: nextProjected ? serializePatientAction(nextProjected) : null,
        progress: projected.progress,
        allClosed:
          visibleActions.length > 0 && visibleActions.every((action) => action.status === "CLOSED"),
      };
    }),
    journey: protectedProcedure.input(patientIdSchema).query(async ({ ctx, input }) => {
      assertPatientAccess(ctx.user, input.patientId);
      const visibleActions = await getVisiblePatientActions(ctx.db, input.patientId);
      const projected = projectPatientJourney(visibleActions, new Date());
      return {
        actions: projected.actions.map(serializePatientAction),
        progress: projected.progress,
      };
    }),
    actionDetails: protectedProcedure.input(actionIdSchema).query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ action: careActions, patient: patients })
        .from(careActions)
        .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
        .innerJoin(patients, eq(carePlans.patientId, patients.id))
        .where(
          and(
            eq(careActions.id, input.actionId),
            eq(careActions.verified, true),
            eq(carePlans.status, "active"),
          ),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This Care action is not available in the active journey.",
        });
      }
      assertPatientAccess(ctx.user, row.patient.id);
      const [projected] = projectPatientJourney([row.action], new Date()).actions;
      if (!projected) {
        throw new TRPCError({ code: "NOT_FOUND", message: "The Care action was not found." });
      }
      return {
        action: serializePatientAction(projected),
        patient: { id: row.patient.id, name: row.patient.name },
      };
    }),
    markCompleted: protectedProcedure
      .input(completeActionSchema)
      .mutation(async ({ ctx, input }) => {
        const row = await getVisiblePatientActionForMutation(ctx.db, input.actionId);
        assertPatientAccess(ctx.user, row.patient.id);
        const transition = patientOutcomeTransition(
          { type: row.action.type, status: row.action.status },
          input.outcome,
        );
        if (!transition.ok) {
          throw new TRPCError({ code: transition.code, message: transition.message });
        }

        if (input.outcome === "skipped") {
          await rejectRecentDuplicateEvent(ctx.db, row.action.id, "skipped");
          await ctx.db.insert(actionEvents).values({
            id: crypto.randomUUID(),
            careActionId: row.action.id,
            patientId: row.patient.id,
            eventType: "skipped",
            createdBy: "patient",
            notes: input.notes ?? "Patient recorded an unconfirmed medication outcome.",
          });
          return { actionId: row.action.id, status: row.action.status, outcome: input.outcome };
        }

        if (input.outcome === "remind") {
          await rejectRecentDuplicateEvent(ctx.db, row.action.id, "reminder_requested");
          await ctx.db.insert(actionEvents).values({
            id: crypto.randomUUID(),
            careActionId: row.action.id,
            patientId: row.patient.id,
            eventType: "reminder_requested",
            createdBy: "patient",
            notes: input.notes ?? "Patient asked to be reminded about this medication.",
          });
          return { actionId: row.action.id, status: row.action.status, outcome: input.outcome };
        }

        if (input.outcome === "help") {
          await rejectRecentDuplicateEvent(ctx.db, row.action.id, "help_requested");
          await ctx.db.insert(actionEvents).values({
            id: crypto.randomUUID(),
            careActionId: row.action.id,
            patientId: row.patient.id,
            eventType: "help_requested",
            createdBy: "patient",
            notes: input.notes ?? "Patient requested Provider support.",
          });
          return { actionId: row.action.id, status: row.action.status, outcome: input.outcome };
        }

        await ctx.db.batch([
          ctx.db
            .update(careActions)
            .set({ status: "COMPLETED" })
            .where(eq(careActions.id, row.action.id)),
          ctx.db.insert(actionEvents).values({
            id: crypto.randomUUID(),
            careActionId: row.action.id,
            patientId: row.patient.id,
            eventType: "completed",
            createdBy: "patient",
            notes:
              input.notes ??
              (input.outcome === "taken"
                ? "Patient confirmed the medication was taken."
                : "Patient marked the Care action complete."),
          }),
        ]);

        return { actionId: row.action.id, status: "COMPLETED" as const, outcome: input.outcome };
      }),
    skipDose: protectedProcedure
      .input(actionIdSchema.extend({ notes: z.string().trim().max(1_000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const row = await getVisiblePatientActionForMutation(ctx.db, input.actionId);
        assertPatientAccess(ctx.user, row.patient.id);
        const transition = patientOutcomeTransition(
          { type: row.action.type, status: row.action.status },
          "skipped",
        );
        if (!transition.ok) {
          throw new TRPCError({ code: transition.code, message: transition.message });
        }
        await rejectRecentDuplicateEvent(ctx.db, row.action.id, "skipped");
        await ctx.db.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: row.action.id,
          patientId: row.patient.id,
          eventType: "skipped",
          createdBy: "patient",
          notes: input.notes ?? "Patient recorded an unconfirmed medication outcome.",
        });
        return { actionId: row.action.id, status: row.action.status, outcome: "skipped" as const };
      }),
    requestHelp: protectedProcedure.input(helpRequestSchema).mutation(async ({ ctx, input }) => {
      let patientId = input.patientId;
      if (input.actionId) {
        const row = await getVisiblePatientActionForMutation(ctx.db, input.actionId);
        assertPatientAccess(ctx.user, row.patient.id);
        patientId = row.patient.id;
        await rejectRecentDuplicateEvent(ctx.db, row.action.id, "help_requested");
      }
      if (!patientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a Patient or Care action for this help request.",
        });
      }
      assertPatientAccess(ctx.user, patientId);

      const reasonLabels = {
        caregiver: "Caregiver help requested",
        transport: "Transport help requested",
        understanding: "Patient needs clearer instructions",
        provider: "Patient asked to contact the Provider",
      } as const;
      const eventId = crypto.randomUUID();
      await ctx.db.insert(actionEvents).values({
        id: eventId,
        careActionId: input.actionId,
        patientId,
        eventType: "help_requested",
        createdBy: "patient",
        notes: input.notes
          ? `${reasonLabels[input.kind]}: ${input.notes}`
          : reasonLabels[input.kind],
      });
      return { eventId, patientId, actionId: input.actionId ?? null };
    }),
    uploadReport: protectedProcedure.input(uploadReportSchema).mutation(async ({ ctx, input }) => {
      const row = await getVisiblePatientActionForMutation(ctx.db, input.actionId);
      assertPatientAccess(ctx.user, row.patient.id);
      const transition = reportUploadTransition({
        type: row.action.type,
        status: row.action.status,
      });
      if (!transition.ok) {
        throw new TRPCError({ code: transition.code, message: transition.message });
      }

      const reportId = crypto.randomUUID();
      await ctx.db.batch([
        ctx.db.insert(reports).values({
          id: reportId,
          careActionId: row.action.id,
          fileUrl: input.fileUrl,
          status: "AWAITING_REVIEW",
        }),
        ctx.db
          .update(careActions)
          .set({ status: "AWAITING_REVIEW" })
          .where(eq(careActions.id, row.action.id)),
        ctx.db.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: row.action.id,
          patientId: row.patient.id,
          eventType: "review_started",
          createdBy: "patient",
          notes: "Patient uploaded a report for Provider review.",
        }),
      ]);
      return { reportId, actionId: row.action.id, status: "AWAITING_REVIEW" as const };
    }),
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

        const carePlanId = crypto.randomUUID();
        const createdAt = new Date();
        const actions = extracted.map((action) => ({
          id: crypto.randomUUID(),
          carePlanId,
          type: action.type,
          title: action.title,
          instructions: action.instructions,
          dueDate: action.dueDate ? new Date(action.dueDate) : null,
          status: "PENDING" as const,
          priority: action.priority,
          sourceText: action.sourceText,
          assignedTo: "patient",
          reviewRequired: action.type === "TEST" || action.type === "REFERRAL",
          verified: false as const,
          nextStepCommunicated: false,
          parentActionId: null,
          payload: {},
          createdAt,
        }));
        await ctx.db.batch([
          ctx.db.insert(carePlans).values({
            id: carePlanId,
            patientId: document.patientId,
            providerId: ctx.user.id,
            status: "draft",
            createdAt,
          }),
          ctx.db.insert(careActions).values(actions),
        ]);

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
            id: carePlanId,
            patientId: document.patientId,
            providerId: ctx.user.id,
            status: "draft" as const,
            createdAt: createdAt.toISOString(),
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
    dashboard: providerProcedure.query(({ ctx }) => buildProviderDashboard(ctx.db)),
    reportDetails: providerProcedure
      .input(z.object({ reportId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const [row] = await ctx.db
          .select({
            report: reports,
            action: careActions,
            plan: carePlans,
            patient: patients,
          })
          .from(reports)
          .innerJoin(careActions, eq(reports.careActionId, careActions.id))
          .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
          .innerJoin(patients, eq(carePlans.patientId, patients.id))
          .where(eq(reports.id, input.reportId))
          .limit(1);
        if (!row) {
          throw new TRPCError({ code: "NOT_FOUND", message: "The report could not be found." });
        }
        if (row.plan.providerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This report belongs to another Provider.",
          });
        }
        return {
          report: {
            ...row.report,
            uploadedAt: row.report.uploadedAt.toISOString(),
            reviewedAt: row.report.reviewedAt?.toISOString() ?? null,
          },
          action: {
            ...row.action,
            dueDate: row.action.dueDate?.toISOString() ?? null,
            createdAt: row.action.createdAt.toISOString(),
          },
          patient: { id: row.patient.id, name: row.patient.name },
          carePlanId: row.plan.id,
        };
      }),
    reviewReport: providerProcedure.input(reviewReportSchema).mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          report: reports,
          action: careActions,
          plan: carePlans,
          patient: patients,
        })
        .from(reports)
        .innerJoin(careActions, eq(reports.careActionId, careActions.id))
        .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
        .innerJoin(patients, eq(carePlans.patientId, patients.id))
        .where(eq(reports.id, input.reportId))
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "The report could not be found." });
      }
      if (row.plan.providerId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This report belongs to another Provider.",
        });
      }
      if (row.report.status !== "AWAITING_REVIEW" || row.action.status !== "AWAITING_REVIEW") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This report has already been reviewed.",
        });
      }
      if (
        !canCloseAction({
          status: "REVIEWED",
          reviewRequired: row.action.reviewRequired,
          nextStepCommunicated: true,
        })
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Completion, review, and next-step communication are required to close.",
        });
      }

      const reviewedAt = new Date();
      const communication =
        input.comment?.trim() ||
        "Provider reviewed the report and communicated that no additional note was required.";
      const reportUpdate = ctx.db
        .update(reports)
        .set({
          status: "REVIEWED",
          providerComment: input.comment,
          reviewedAt,
        })
        .where(eq(reports.id, row.report.id));
      const actionUpdate = ctx.db
        .update(careActions)
        .set({ status: "CLOSED", nextStepCommunicated: true })
        .where(eq(careActions.id, row.action.id));
      const reviewEvent = ctx.db.insert(actionEvents).values({
        id: crypto.randomUUID(),
        careActionId: row.action.id,
        patientId: row.patient.id,
        eventType: "reviewed",
        createdBy: "provider",
        notes: communication,
      });
      const closeEvent = ctx.db.insert(actionEvents).values({
        id: crypto.randomUUID(),
        careActionId: row.action.id,
        patientId: row.patient.id,
        eventType: "closed",
        createdBy: "provider",
        notes: "Loop closed after completion, review, and next-step communication.",
      });

      let followUpId: string | null = null;
      if (input.followUp) {
        followUpId = crypto.randomUUID();
        await ctx.db.batch([
          reportUpdate,
          actionUpdate,
          reviewEvent,
          ctx.db.insert(careActions).values({
            id: followUpId,
            carePlanId: row.plan.id,
            parentActionId: row.action.id,
            type: "FOLLOW_UP",
            title: input.followUp.title,
            instructions: input.followUp.instructions,
            dueDate: input.followUp.dueDate ? new Date(input.followUp.dueDate) : undefined,
            priority: input.followUp.priority,
            sourceText: input.followUp.sourceText,
            assignedTo: input.followUp.assignedTo,
            reviewRequired: input.followUp.reviewRequired,
            verified: true,
            payload: input.followUp.payload,
          }),
          ctx.db.insert(actionEvents).values({
            id: crypto.randomUUID(),
            careActionId: followUpId,
            patientId: row.patient.id,
            eventType: "follow_up_created",
            createdBy: "provider",
            notes: "Provider created a follow-up while reviewing the report.",
          }),
          closeEvent,
        ]);
      } else {
        await ctx.db.batch([reportUpdate, actionUpdate, reviewEvent, closeEvent]);
      }

      return {
        reportId: row.report.id,
        actionId: row.action.id,
        status: "CLOSED" as const,
        reviewedAt: reviewedAt.toISOString(),
        followUpId,
      };
    }),
    createFollowUp: providerProcedure
      .input(
        z.object({
          carePlanId: z.string().uuid(),
          parentActionId: z.string().uuid().optional(),
          action: careActionSchema.refine((action) => action.type === "FOLLOW_UP", {
            message: "Follow-up action must use type FOLLOW_UP.",
          }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [plan] = await ctx.db
          .select()
          .from(carePlans)
          .where(eq(carePlans.id, input.carePlanId))
          .limit(1);
        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND", message: "The Care plan was not found." });
        }
        if (plan.providerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This Care plan belongs to another Provider.",
          });
        }
        if (plan.status !== "active") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Follow-ups can only be added to an active Care plan.",
          });
        }

        const [parent] = input.parentActionId
          ? await ctx.db
              .select()
              .from(careActions)
              .where(
                and(
                  eq(careActions.id, input.parentActionId),
                  eq(careActions.carePlanId, input.carePlanId),
                ),
              )
              .limit(1)
          : [];
        if (input.parentActionId && !parent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The parent Care action was not found in this plan.",
          });
        }

        const followUpId = crypto.randomUUID();
        const insertFollowUp = ctx.db.insert(careActions).values({
          id: followUpId,
          carePlanId: plan.id,
          parentActionId: parent?.id,
          type: "FOLLOW_UP",
          title: input.action.title,
          instructions: input.action.instructions,
          dueDate: input.action.dueDate ? new Date(input.action.dueDate) : undefined,
          priority: input.action.priority,
          sourceText: input.action.sourceText,
          assignedTo: input.action.assignedTo,
          reviewRequired: input.action.reviewRequired,
          verified: true,
          payload: input.action.payload,
        });
        const followUpEvent = ctx.db.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: followUpId,
          patientId: plan.patientId,
          eventType: "follow_up_created",
          createdBy: "provider",
          notes: "Provider communicated and created a follow-up Care action.",
        });

        if (!parent) {
          await ctx.db.batch([insertFollowUp, followUpEvent]);
        } else {
          const shouldClose =
            parent.status !== "CLOSED" &&
            canCloseAction({
              status: parent.status,
              reviewRequired: parent.reviewRequired,
              nextStepCommunicated: true,
            });
          const parentUpdate = ctx.db
            .update(careActions)
            .set({
              nextStepCommunicated: true,
              status: shouldClose ? "CLOSED" : parent.status,
            })
            .where(eq(careActions.id, parent.id));
          if (shouldClose) {
            await ctx.db.batch([
              insertFollowUp,
              followUpEvent,
              parentUpdate,
              ctx.db.insert(actionEvents).values({
                id: crypto.randomUUID(),
                careActionId: parent.id,
                patientId: plan.patientId,
                eventType: "closed",
                createdBy: "provider",
                notes: "Loop closed after the Provider communicated the follow-up.",
              }),
            ]);
          } else {
            await ctx.db.batch([insertFollowUp, followUpEvent, parentUpdate]);
          }
        }

        return { id: followUpId, carePlanId: plan.id, parentActionId: parent?.id ?? null };
      }),
    listCareGaps: providerProcedure.input(careGapListSchema).query(async ({ ctx, input }) => {
      const dashboard = await buildProviderDashboard(ctx.db, input?.patientId);
      return dashboard.items.flatMap((item) =>
        item.gaps.map((gap) => ({
          ...gap,
          itemId: item.id,
          actionId: item.actionId,
          patient: item.patient,
          title: item.title,
          dueDate: item.dueDate,
          section: item.section,
        })),
      );
    }),
  }),
});

export type AppRouter = typeof appRouter;
