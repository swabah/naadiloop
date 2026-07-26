import { type ExtractedCareAction, extractCareActions } from "@naadi/ai";
import {
  actionEvents,
  careActions,
  carePlans,
  type getDb,
  medicationDoseRecords,
  organizationDetails,
  patientLinkRequests,
  patients,
  providerPatientAssignments,
  reports,
  sourceDocuments,
  uhidFromPatientId,
  users,
} from "@naadi/db";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { and, asc, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { patientOutcomeTransition, reportUploadTransition } from "./action-transitions";
import { dashboardSectionFor, evaluateCareGaps } from "./care-gaps";
import { canCloseAction } from "./closure-policy";
import { getJwtSecret } from "./context";
import {
  isStructuredMedicationSchedule,
  localDateFromUtc,
  scheduledDosesForDate,
  scheduledDosesThroughDate,
} from "./medication-schedule";
import {
  type PatientActionRecord,
  projectPatientJourney,
  selectNextPatientAction,
} from "./patient-actions";
import { patientLinkOtp } from "./patient-link-otp";
import { carePlanRouter } from "./router-care-plan";
import {
  actionIdSchema,
  adminApprovalSchema,
  careActionSchema,
  careGapListSchema,
  completeActionSchema,
  documentInputSchema,
  helpRequestSchema,
  loginInputSchema,
  patientIdSchema,
  patientJourneySchema,
  patientLinkSchema,
  patientLookupSchema,
  recordDoseSchema,
  registerInputSchema,
  reviewReportSchema,
  todaySchema,
  uploadReportSchema,
} from "./schemas";
import {
  patientProcedure,
  protectedProcedure,
  providerProcedure,
  publicProcedure,
  router,
  superAdminProcedure,
} from "./trpc";

function assertPatientAccess(user: { role: string; patientId?: string }, patientId: string) {
  if (user.role === "patient" && user.patientId !== patientId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Care journey belongs to another Patient.",
    });
  }
}

async function assertProviderPatientAccess(
  db: ReturnType<typeof getDb>,
  providerId: string,
  patientId: string,
) {
  const assignment = await db.query.providerPatientAssignments.findFirst({
    where: and(
      eq(providerPatientAssignments.providerId, providerId),
      eq(providerPatientAssignments.patientId, patientId),
    ),
  });
  if (!assignment) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Patient is not assigned to your Provider account.",
    });
  }
}

function otpForLinkRequest(request: { patientId: string; providerId: string; requestedAt: Date }) {
  const nonce = `${request.providerId}:${request.requestedAt.toISOString()}`;
  return patientLinkOtp(request.patientId, nonce, getJwtSecret());
}

async function getActivePatientLinkRequest(db: ReturnType<typeof getDb>, patientId: string) {
  const [request] = await db
    .select({
      patientId: patientLinkRequests.patientId,
      providerId: patientLinkRequests.providerId,
      providerName: users.name,
      requestedAt: patientLinkRequests.requestedAt,
      expiresAt: patientLinkRequests.expiresAt,
    })
    .from(patientLinkRequests)
    .innerJoin(users, eq(users.id, patientLinkRequests.providerId))
    .where(
      and(
        eq(patientLinkRequests.patientId, patientId),
        gt(patientLinkRequests.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(patientLinkRequests.requestedAt))
    .limit(1);

  return request;
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

function medicationPayload(action: { type: string; payload: unknown }) {
  return action.type === "MEDICATION" && isStructuredMedicationSchedule(action.payload)
    ? action.payload
    : null;
}

async function getDoseRecords(
  db: ReturnType<typeof getDb>,
  patientId: string,
  actionIds: string[],
) {
  if (actionIds.length === 0) return [];
  return db
    .select()
    .from(medicationDoseRecords)
    .where(
      and(
        eq(medicationDoseRecords.patientId, patientId),
        inArray(medicationDoseRecords.careActionId, actionIds),
      ),
    )
    .orderBy(asc(medicationDoseRecords.scheduledFor));
}

async function buildProviderDashboard(
  db: ReturnType<typeof getDb>,
  providerId: string,
  patientId?: string,
) {
  const now = new Date();
  const rows = await db
    .select({ action: careActions, patient: patients })
    .from(careActions)
    .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
    .innerJoin(patients, eq(carePlans.patientId, patients.id))
    .where(
      and(
        eq(carePlans.providerId, providerId),
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
      const latestHelpRequest = events
        .filter((event) => event.eventType === "help_requested")
        .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())[0];
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
        supportRequestId: gaps.some((gap) => gap.rule === "CG-4")
          ? (latestHelpRequest?.id ?? null)
          : null,
      };
    }),
  );

  const patientHelpRows = await db
    .select({ event: actionEvents, patient: patients })
    .from(actionEvents)
    .innerJoin(patients, eq(actionEvents.patientId, patients.id))
    .innerJoin(providerPatientAssignments, eq(providerPatientAssignments.patientId, patients.id))
    .where(
      and(
        eq(providerPatientAssignments.providerId, providerId),
        isNull(actionEvents.careActionId),
        inArray(actionEvents.eventType, ["help_requested", "help_resolved"]),
        patientId ? eq(patients.id, patientId) : undefined,
      ),
    )
    .orderBy(desc(actionEvents.timestamp));

  const unresolvedPatientHelpRows = patientHelpRows.filter(
    (row) =>
      row.event.eventType === "help_requested" &&
      !patientHelpRows.some(
        (candidate) =>
          candidate.patient.id === row.patient.id &&
          candidate.event.eventType === "help_resolved" &&
          candidate.event.timestamp >= row.event.timestamp,
      ),
  );

  const patientHelpItems = unresolvedPatientHelpRows.map((row) => ({
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
    supportRequestId: row.event.id,
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

async function buildProviderPatientOverview(
  db: ReturnType<typeof getDb>,
  providerId: string,
  patientId: string,
) {
  await assertProviderPatientAccess(db, providerId, patientId);
  const patient = await db.query.patients.findFirst({ where: eq(patients.id, patientId) });
  if (!patient) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The Patient could not be found." });
  }

  const planRows = await db
    .select({
      plan: carePlans,
      document: {
        id: sourceDocuments.id,
        documentType: sourceDocuments.documentType,
        uploadedAt: sourceDocuments.uploadedAt,
      },
    })
    .from(carePlans)
    .leftJoin(sourceDocuments, eq(carePlans.sourceDocumentId, sourceDocuments.id))
    .where(and(eq(carePlans.providerId, providerId), eq(carePlans.patientId, patientId)))
    .orderBy(desc(carePlans.createdAt), desc(carePlans.id));

  const planIds = planRows.map((row) => row.plan.id);
  const ownedActions =
    planIds.length > 0
      ? await db
          .select()
          .from(careActions)
          .where(inArray(careActions.carePlanId, planIds))
          .orderBy(desc(careActions.createdAt), desc(careActions.id))
      : [];
  const actionIds = ownedActions.map((action) => action.id);
  const ownedReports =
    actionIds.length > 0
      ? await db
          .select()
          .from(reports)
          .where(inArray(reports.careActionId, actionIds))
          .orderBy(desc(reports.uploadedAt), desc(reports.id))
      : [];
  const relevantEvents = await db
    .select()
    .from(actionEvents)
    .where(
      actionIds.length > 0
        ? or(
            inArray(actionEvents.careActionId, actionIds),
            and(eq(actionEvents.patientId, patientId), isNull(actionEvents.careActionId)),
          )
        : and(eq(actionEvents.patientId, patientId), isNull(actionEvents.careActionId)),
    )
    .orderBy(desc(actionEvents.timestamp), desc(actionEvents.id));

  const unresolvedSupportRequests = relevantEvents.filter(
    (event) =>
      event.eventType === "help_requested" &&
      !relevantEvents.some(
        (candidate) =>
          candidate.eventType === "help_resolved" &&
          candidate.careActionId === event.careActionId &&
          candidate.timestamp >= event.timestamp,
      ),
  );
  const actionById = new Map(ownedActions.map((action) => [action.id, action]));
  const activePlanIds = new Set(
    planRows.filter((row) => row.plan.status === "active").map((row) => row.plan.id),
  );
  const reportsByAction = new Map(ownedReports.map((report) => [report.careActionId, report]));
  const eventsByAction = new Map<string, typeof relevantEvents>();
  for (const event of relevantEvents) {
    if (!event.careActionId) continue;
    const existing = eventsByAction.get(event.careActionId) ?? [];
    existing.push(event);
    eventsByAction.set(event.careActionId, existing);
  }
  const actionsByPlan = new Map<string, typeof ownedActions>();
  for (const action of ownedActions) {
    const existing = actionsByPlan.get(action.carePlanId) ?? [];
    existing.push(action);
    actionsByPlan.set(action.carePlanId, existing);
  }

  return {
    patient: {
      id: patient.id,
      uhid: patient.uhid,
      name: patient.name,
      age: patient.age,
      phone: patient.phone,
      language: patient.language,
      caregiverContact: patient.caregiverContact ?? null,
      assigned: true,
      createdAt: patient.createdAt.toISOString(),
    },
    summary: {
      activeJourneys: planRows.filter((row) => row.plan.status === "active").length,
      drafts: planRows.filter(
        (row) => row.plan.status === "draft" || row.plan.status === "verified",
      ).length,
      openActions: ownedActions.filter(
        (action) => activePlanIds.has(action.carePlanId) && action.status !== "CLOSED",
      ).length,
      awaitingReview: ownedReports.filter(
        (report) =>
          report.status === "AWAITING_REVIEW" &&
          activePlanIds.has(actionById.get(report.careActionId)?.carePlanId ?? ""),
      ).length,
      supportRequests: unresolvedSupportRequests.length,
      closedActions: ownedActions.filter((action) => action.status === "CLOSED").length,
    },
    carePlans: planRows.map((row) => ({
      id: row.plan.id,
      status: row.plan.status,
      createdAt: row.plan.createdAt.toISOString(),
      verifiedAt: row.plan.verifiedAt?.toISOString() ?? null,
      document: row.document?.id
        ? {
            id: row.document.id,
            documentType: row.document.documentType,
            uploadedAt: row.document.uploadedAt.toISOString(),
          }
        : null,
      actions: (actionsByPlan.get(row.plan.id) ?? []).map((action) => {
        const report = reportsByAction.get(action.id);
        return {
          ...action,
          dueDate: action.dueDate?.toISOString() ?? null,
          createdAt: action.createdAt.toISOString(),
          report: report
            ? {
                id: report.id,
                fileName: report.fileName,
                fileType: report.fileType,
                fileSize: report.fileSize,
                status: report.status,
                providerComment: report.providerComment,
                uploadedAt: report.uploadedAt.toISOString(),
                reviewedAt: report.reviewedAt?.toISOString() ?? null,
              }
            : null,
          events: (eventsByAction.get(action.id) ?? []).map((event) => ({
            id: event.id,
            eventType: event.eventType,
            createdBy: event.createdBy,
            notes: event.notes,
            timestamp: event.timestamp.toISOString(),
          })),
        };
      }),
    })),
    supportRequests: unresolvedSupportRequests.map((event) => ({
      id: event.id,
      actionId: event.careActionId,
      actionTitle: event.careActionId ? (actionById.get(event.careActionId)?.title ?? null) : null,
      notes: event.notes,
      timestamp: event.timestamp.toISOString(),
    })),
    activity: relevantEvents.map((event) => ({
      id: event.id,
      actionId: event.careActionId,
      actionTitle: event.careActionId ? (actionById.get(event.careActionId)?.title ?? null) : null,
      eventType: event.eventType,
      createdBy: event.createdBy,
      notes: event.notes,
      timestamp: event.timestamp.toISOString(),
    })),
  };
}

export const appRouter = router({
  auth: router({
    register: publicProcedure.input(registerInputSchema).mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const aadhaarNumber =
        input.role === "patient" ? input.aadhaarNumber?.replace(/\s/g, "") : undefined;
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email address already exists.",
        });
      }
      if (aadhaarNumber) {
        const existingAadhaar = await ctx.db.query.users.findFirst({
          where: eq(users.aadhaarNumber, aadhaarNumber),
        });
        if (existingAadhaar) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A Patient account with this Aadhaar number already exists.",
          });
        }
      }

      const status = input.role === "patient" ? "active" : "pending_approval";
      const registration = await ctx.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            name: input.name,
            email,
            passwordHash: await bcrypt.hash(input.password, 10),
            phone: input.phone,
            aadhaarNumber,
            role: input.role,
            status,
          })
          .returning();
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The account could not be created. Please try again.",
          });
        }

        if (input.role === "patient") {
          const uhid = uhidFromPatientId(user.id);
          await tx.insert(patients).values({
            id: user.id,
            uhid,
            name: input.name,
            age: input.age ?? null,
            phone: input.phone ?? null,
            language: input.language ?? "en",
          });
          return { uhid };
        } else {
          await tx.insert(organizationDetails).values({
            userId: user.id,
            orgName: input.orgName ?? `${input.name}'s Facility`,
            orgType: input.role === "hospital_admin" ? "hospital" : "pharmacy",
            licenseNumber: input.licenseNumber ?? "PENDING",
            address: input.address,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
          });
          return { uhid: null };
        }
      });

      return {
        success: true,
        status,
        uhid: registration.uhid,
        message:
          input.role === "patient"
            ? "Registration successful. Keep your UHID safe; a Hospital needs it to request access."
            : "Registration submitted. Your administration account is pending approval.",
      };
    }),
    login: publicProcedure.input(loginInputSchema).mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });
      if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }
      if (user.status !== "active") {
        if (user.status === "pending_approval") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Your administration account is pending approval.",
          });
        }
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your administration account registration was rejected.",
        });
      }

      const patientProfile =
        user.role === "patient"
          ? await ctx.db.query.patients.findFirst({ where: eq(patients.id, user.id) })
          : null;
      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        patientId: user.role === "patient" ? user.id : undefined,
        uhid: patientProfile?.uhid,
      };
      return {
        token: jwt.sign({}, getJwtSecret(), {
          subject: user.id,
          issuer: "naadi-loop",
          audience: "naadi-loop-web",
          expiresIn: "7d",
        }),
        user: payload,
      };
    }),
    me: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "patient") return ctx.user;

      const request = await getActivePatientLinkRequest(ctx.db, ctx.user.id);
      return {
        ...ctx.user,
        linkRequest: request
          ? {
              otp: otpForLinkRequest(request),
              providerName: request.providerName,
              expiresAt: request.expiresAt.toISOString(),
            }
          : null,
      };
    }),
  }),
  admin: router({
    pendingApprovals: superAdminProcedure.query(async ({ ctx }) => {
      const pendingUsers = await ctx.db.query.users.findMany({
        where: eq(users.status, "pending_approval"),
      });
      const userIds = pendingUsers.map((user) => user.id);
      const organizations =
        userIds.length > 0 ? await ctx.db.query.organizationDetails.findMany() : [];
      const organizationByUser = new Map(
        organizations
          .filter((organization) => userIds.includes(organization.userId))
          .map((organization) => [organization.userId, organization]),
      );
      return pendingUsers.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        organization: organizationByUser.get(user.id) ?? null,
      }));
    }),
    approveUser: superAdminProcedure.input(adminApprovalSchema).mutation(async ({ ctx, input }) => {
      const target = await ctx.db.query.users.findFirst({ where: eq(users.id, input.userId) });
      if (
        target?.status !== "pending_approval" ||
        !["hospital_admin", "pharmacy_admin"].includes(target?.role ?? "")
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
      }
      const [updated] = await ctx.db
        .update(users)
        .set({ status: input.action === "approve" ? "active" : "rejected" })
        .where(eq(users.id, input.userId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
      return { success: true, userId: updated.id, status: updated.status };
    }),
  }),
  patient: router({
    list: providerProcedure.query(({ ctx }) =>
      ctx.db
        .select({ patient: patients })
        .from(providerPatientAssignments)
        .innerJoin(patients, eq(providerPatientAssignments.patientId, patients.id))
        .where(eq(providerPatientAssignments.providerId, ctx.user.id))
        .orderBy(desc(patients.createdAt), asc(patients.name))
        .then((rows) => rows.map((row) => row.patient)),
    ),
    findByUhid: providerProcedure.input(patientLookupSchema).query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ patient: patients })
        .from(patients)
        .innerJoin(users, eq(users.id, patients.id))
        .where(
          and(eq(patients.uhid, input.uhid), eq(users.role, "patient"), eq(users.status, "active")),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active Patient was found for this UHID.",
        });
      }
      const assigned = await ctx.db.query.providerPatientAssignments.findFirst({
        where: and(
          eq(providerPatientAssignments.providerId, ctx.user.id),
          eq(providerPatientAssignments.patientId, row.patient.id),
        ),
      });
      const phoneDigits = row.patient.phone?.replace(/\D/g, "") ?? "";
      return {
        patient: {
          uhid: row.patient.uhid,
          name: row.patient.name,
          phoneHint: phoneDigits ? `ending ${phoneDigits.slice(-4)}` : "not available",
        },
        alreadyAssigned: Boolean(assigned),
      };
    }),
    requestLink: providerProcedure.input(patientLookupSchema).mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ patient: patients })
        .from(patients)
        .innerJoin(users, eq(users.id, patients.id))
        .where(
          and(eq(patients.uhid, input.uhid), eq(users.role, "patient"), eq(users.status, "active")),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active Patient was found for this UHID.",
        });
      }

      const assigned = await ctx.db.query.providerPatientAssignments.findFirst({
        where: and(
          eq(providerPatientAssignments.providerId, ctx.user.id),
          eq(providerPatientAssignments.patientId, row.patient.id),
        ),
      });
      if (!assigned) {
        const requestedAt = new Date();
        const expiresAt = new Date(requestedAt.getTime() + 10 * 60_000);
        await ctx.db.transaction(async (tx) => {
          await tx
            .delete(patientLinkRequests)
            .where(eq(patientLinkRequests.patientId, row.patient.id));
          await tx.insert(patientLinkRequests).values({
            providerId: ctx.user.id,
            patientId: row.patient.id,
            requestedAt,
            expiresAt,
          });
        });
      }

      const phoneDigits = row.patient.phone?.replace(/\D/g, "") ?? "";
      return {
        patient: {
          uhid: row.patient.uhid,
          name: row.patient.name,
          phoneHint: phoneDigits ? `ending ${phoneDigits.slice(-4)}` : "not available",
        },
        alreadyAssigned: Boolean(assigned),
      };
    }),
    linkByUhid: providerProcedure.input(patientLinkSchema).mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ patient: patients })
        .from(patients)
        .innerJoin(users, eq(users.id, patients.id))
        .where(
          and(eq(patients.uhid, input.uhid), eq(users.role, "patient"), eq(users.status, "active")),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No active Patient was found for this UHID.",
        });
      }
      const request = await ctx.db.query.patientLinkRequests.findFirst({
        where: and(
          eq(patientLinkRequests.providerId, ctx.user.id),
          eq(patientLinkRequests.patientId, row.patient.id),
          gt(patientLinkRequests.expiresAt, new Date()),
        ),
      });
      if (!request) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This OTP request has expired. Search the Patient UHID again.",
        });
      }
      const expectedOtp = otpForLinkRequest(request);
      if (input.otp !== expectedOtp) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid OTP. Ask the Patient to check the current code in their profile.",
        });
      }
      const inserted = await ctx.db.transaction(async (tx) => {
        const linked = await tx
          .insert(providerPatientAssignments)
          .values({ providerId: ctx.user.id, patientId: row.patient.id })
          .onConflictDoNothing()
          .returning({ patientId: providerPatientAssignments.patientId });
        await tx
          .delete(patientLinkRequests)
          .where(eq(patientLinkRequests.patientId, row.patient.id));
        return linked;
      });
      return {
        patient: {
          id: row.patient.id,
          uhid: row.patient.uhid,
          name: row.patient.name,
        },
        linked: inserted.length > 0,
      };
    }),
    nextAction: patientProcedure.input(patientIdSchema).query(async ({ ctx, input }) => {
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
    today: patientProcedure.input(todaySchema).query(async ({ ctx, input }) => {
      assertPatientAccess(ctx.user, input.patientId);
      const now = new Date();
      const visibleActions = await getVisiblePatientActions(ctx.db, input.patientId);
      const structuredMedicationActions = visibleActions.filter((action) =>
        Boolean(medicationPayload(action)),
      );
      const records = await getDoseRecords(
        ctx.db,
        input.patientId,
        structuredMedicationActions.map((action) => action.id),
      );
      const recordByDose = new Map(
        records.map((record) => [
          `${record.careActionId}:${record.scheduledFor.toISOString()}`,
          record,
        ]),
      );
      const items: Array<{
        id: string;
        kind: "medication_dose" | "care_action";
        actionId: string;
        title: string;
        instructions: string;
        scheduledFor: string | null;
        status: "taken" | "skipped" | "completed" | null;
        section: "overdue" | "now" | "later" | "done";
        actionType: (typeof careActions.$inferSelect)["type"];
      }> = [];

      for (const action of visibleActions) {
        const schedule = medicationPayload(action);
        if (schedule) {
          for (const dose of scheduledDosesThroughDate(
            schedule,
            input.date,
            input.timezoneOffsetMinutes,
          )) {
            const scheduledFor = dose.scheduledFor.toISOString();
            const record = recordByDose.get(`${action.id}:${scheduledFor}`);
            if (dose.date !== input.date && record) continue;
            const section = record
              ? "done"
              : dose.scheduledFor.getTime() < now.getTime()
                ? "overdue"
                : dose.scheduledFor.getTime() <= now.getTime() + 60 * 60_000
                  ? "now"
                  : "later";
            items.push({
              id: `dose:${action.id}:${scheduledFor}`,
              kind: "medication_dose",
              actionId: action.id,
              title: action.title,
              instructions: action.instructions,
              scheduledFor,
              status: record?.status ?? null,
              section,
              actionType: action.type,
            });
          }
          continue;
        }

        const dueLocalDate = action.dueDate
          ? localDateFromUtc(action.dueDate, input.timezoneOffsetMinutes)
          : null;
        const completed = ["COMPLETED", "AWAITING_REVIEW", "REVIEWED", "CLOSED"].includes(
          action.status,
        );
        if (
          (dueLocalDate && dueLocalDate > input.date) ||
          (completed && dueLocalDate !== input.date)
        ) {
          continue;
        }
        const section = completed
          ? "done"
          : dueLocalDate && dueLocalDate < input.date
            ? "overdue"
            : action.dueDate && action.dueDate.getTime() > now.getTime() + 60 * 60_000
              ? "later"
              : "now";
        items.push({
          id: `action:${action.id}`,
          kind: "care_action",
          actionId: action.id,
          title: action.title,
          instructions: action.instructions,
          scheduledFor: action.dueDate?.toISOString() ?? null,
          status: completed ? "completed" : null,
          section,
          actionType: action.type,
        });
      }

      const rank = { overdue: 0, now: 1, later: 2, done: 3 } as const;
      items.sort(
        (left, right) =>
          rank[left.section] - rank[right.section] ||
          (left.scheduledFor ?? "").localeCompare(right.scheduledFor ?? "") ||
          left.title.localeCompare(right.title),
      );
      return {
        date: input.date,
        items,
        progress: {
          resolved: items.filter((item) => item.section === "done").length,
          total: items.length,
        },
      };
    }),
    journey: patientProcedure.input(patientJourneySchema).query(async ({ ctx, input }) => {
      assertPatientAccess(ctx.user, input.patientId);
      const visibleActions = await getVisiblePatientActions(ctx.db, input.patientId);
      const projected = projectPatientJourney(visibleActions, new Date());
      const structuredMedicationActions = visibleActions.filter((action) =>
        Boolean(medicationPayload(action)),
      );
      const records = input.date
        ? await getDoseRecords(
            ctx.db,
            input.patientId,
            structuredMedicationActions.map((action) => action.id),
          )
        : [];
      return {
        actions: projected.actions.map((action) => {
          const schedule = medicationPayload(action);
          const todayDoses =
            schedule && input.date
              ? scheduledDosesForDate(schedule, input.date, input.timezoneOffsetMinutes)
              : [];
          const scheduled = new Set(todayDoses.map((dose) => dose.scheduledFor.toISOString()));
          const resolved = records.filter(
            (record) =>
              record.careActionId === action.id && scheduled.has(record.scheduledFor.toISOString()),
          ).length;
          return {
            ...serializePatientAction(action),
            medicationToday: schedule
              ? {
                  resolved,
                  total: todayDoses.length,
                }
              : null,
          };
        }),
        progress: projected.progress,
      };
    }),
    actionDetails: patientProcedure.input(actionIdSchema).query(async ({ ctx, input }) => {
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
    recordDose: patientProcedure.input(recordDoseSchema).mutation(async ({ ctx, input }) => {
      const row = await getVisiblePatientActionForMutation(ctx.db, input.actionId);
      assertPatientAccess(ctx.user, row.patient.id);
      const schedule = medicationPayload(row.action);
      if (!schedule) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This medication does not have a Provider-confirmed dose schedule.",
        });
      }
      if (row.action.status === "CLOSED") {
        throw new TRPCError({ code: "CONFLICT", message: "This medication course is closed." });
      }

      const scheduledFor = new Date(input.scheduledFor);
      const localDate = localDateFromUtc(scheduledFor, input.timezoneOffsetMinutes);
      const validDose = scheduledDosesForDate(
        schedule,
        localDate,
        input.timezoneOffsetMinutes,
      ).some((dose) => dose.scheduledFor.getTime() === scheduledFor.getTime());
      if (!validDose) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That dose does not belong to the confirmed medication schedule.",
        });
      }

      const [existing] = await ctx.db
        .select()
        .from(medicationDoseRecords)
        .where(
          and(
            eq(medicationDoseRecords.careActionId, row.action.id),
            eq(medicationDoseRecords.scheduledFor, scheduledFor),
          ),
        )
        .limit(1);
      if (existing?.status === input.status) {
        return {
          actionId: row.action.id,
          scheduledFor: scheduledFor.toISOString(),
          status: input.status,
          unchanged: true,
          courseCompleted: row.action.status === "COMPLETED",
        };
      }

      let courseCompleted = row.action.status === "COMPLETED";
      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(medicationDoseRecords)
          .values({
            id: existing?.id ?? crypto.randomUUID(),
            careActionId: row.action.id,
            patientId: row.patient.id,
            scheduledFor,
            status: input.status,
            recordedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [medicationDoseRecords.careActionId, medicationDoseRecords.scheduledFor],
            set: { status: input.status, recordedAt: new Date() },
          });
        await tx.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: row.action.id,
          patientId: row.patient.id,
          eventType: input.status === "taken" ? "dose_taken" : "dose_skipped",
          createdBy: "patient",
          notes: `Patient marked the ${scheduledFor.toISOString()} dose ${input.status}.`,
        });

        if (schedule.durationDays && row.action.status !== "COMPLETED") {
          const [countRow] = await tx
            .select({ value: count() })
            .from(medicationDoseRecords)
            .where(eq(medicationDoseRecords.careActionId, row.action.id));
          const resolvedCount = countRow?.value ?? 0;
          const totalDoses = schedule.durationDays * schedule.frequencyPerDay;
          if (resolvedCount >= totalDoses) {
            await tx
              .update(careActions)
              .set({ status: "COMPLETED" })
              .where(eq(careActions.id, row.action.id));
            await tx.insert(actionEvents).values({
              id: crypto.randomUUID(),
              careActionId: row.action.id,
              patientId: row.patient.id,
              eventType: "completed",
              createdBy: "system",
              notes: "All scheduled doses in the medication course were resolved.",
            });
            courseCompleted = true;
          }
        }
      });
      return {
        actionId: row.action.id,
        scheduledFor: scheduledFor.toISOString(),
        status: input.status,
        unchanged: false,
        courseCompleted,
      };
    }),
    markCompleted: patientProcedure.input(completeActionSchema).mutation(async ({ ctx, input }) => {
      const row = await getVisiblePatientActionForMutation(ctx.db, input.actionId);
      assertPatientAccess(ctx.user, row.patient.id);
      if (
        row.action.type === "MEDICATION" &&
        medicationPayload(row.action) &&
        ["taken", "skipped"].includes(input.outcome)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Record each scheduled medication dose separately.",
        });
      }
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

      await ctx.db.transaction(async (tx) => {
        const [updated] = await tx
          .update(careActions)
          .set({ status: "COMPLETED" })
          .where(and(eq(careActions.id, row.action.id), eq(careActions.status, row.action.status)))
          .returning({ id: careActions.id });
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This Care action was already updated.",
          });
        }
        await tx.insert(actionEvents).values({
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
        });
      });

      return { actionId: row.action.id, status: "COMPLETED" as const, outcome: input.outcome };
    }),
    skipDose: patientProcedure
      .input(actionIdSchema.extend({ notes: z.string().trim().max(1_000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const row = await getVisiblePatientActionForMutation(ctx.db, input.actionId);
        assertPatientAccess(ctx.user, row.patient.id);
        if (medicationPayload(row.action)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Record each scheduled medication dose separately.",
          });
        }
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
    requestHelp: patientProcedure.input(helpRequestSchema).mutation(async ({ ctx, input }) => {
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
    uploadReport: patientProcedure.input(uploadReportSchema).mutation(async ({ ctx, input }) => {
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
      await ctx.db.transaction(async (tx) => {
        await tx.insert(reports).values({
          id: reportId,
          careActionId: row.action.id,
          fileName: input.file.name,
          fileType: input.file.type,
          fileSize: input.file.size,
          status: "AWAITING_REVIEW",
        });
        const [updated] = await tx
          .update(careActions)
          .set({ status: "AWAITING_REVIEW" })
          .where(and(eq(careActions.id, row.action.id), eq(careActions.status, row.action.status)))
          .returning({ id: careActions.id });
        if (!updated) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This test was already completed or submitted.",
          });
        }
        await tx.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: row.action.id,
          patientId: row.patient.id,
          eventType: "completed",
          createdBy: "patient",
          notes: "Patient completed the test and returned report metadata.",
        });
        await tx.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: row.action.id,
          patientId: row.patient.id,
          eventType: "review_started",
          createdBy: "patient",
          notes: "Patient uploaded a report for Provider review.",
        });
      });
      return { reportId, actionId: row.action.id, status: "AWAITING_REVIEW" as const };
    }),
  }),
  document: router({
    create: providerProcedure.input(documentInputSchema).mutation(async ({ ctx, input }) => {
      await assertProviderPatientAccess(ctx.db, ctx.user.id, input.patientId);
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
        await assertProviderPatientAccess(ctx.db, ctx.user.id, document.patientId);

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

        const existingPlan = await ctx.db.query.carePlans.findFirst({
          where: and(
            eq(carePlans.providerId, ctx.user.id),
            eq(carePlans.sourceDocumentId, document.id),
            eq(carePlans.status, "draft"),
          ),
        });
        const carePlanId = existingPlan?.id ?? crypto.randomUUID();
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
        await ctx.db.transaction(async (tx) => {
          if (existingPlan) {
            await tx.delete(careActions).where(eq(careActions.carePlanId, carePlanId));
          } else {
            await tx.insert(carePlans).values({
              id: carePlanId,
              patientId: document.patientId,
              providerId: ctx.user.id,
              sourceDocumentId: document.id,
              status: "draft",
              createdAt,
            });
          }
          await tx.insert(careActions).values(actions);
        });

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
  carePlan: carePlanRouter,
  provider: router({
    dashboard: providerProcedure.query(({ ctx }) => buildProviderDashboard(ctx.db, ctx.user.id)),
    patientOverview: providerProcedure
      .input(patientIdSchema)
      .query(({ ctx, input }) =>
        buildProviderPatientOverview(ctx.db, ctx.user.id, input.patientId),
      ),
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
      let followUpId: string | null = null;
      await ctx.db.transaction(async (tx) => {
        const [updatedReport] = await tx
          .update(reports)
          .set({
            status: "REVIEWED",
            providerComment: input.comment,
            reviewedAt,
          })
          .where(and(eq(reports.id, row.report.id), eq(reports.status, "AWAITING_REVIEW")))
          .returning({ id: reports.id });
        if (!updatedReport) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This report has already been reviewed.",
          });
        }
        const [updatedAction] = await tx
          .update(careActions)
          .set({ status: "CLOSED", nextStepCommunicated: true })
          .where(and(eq(careActions.id, row.action.id), eq(careActions.status, "AWAITING_REVIEW")))
          .returning({ id: careActions.id });
        if (!updatedAction) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This Care action was already updated.",
          });
        }
        await tx.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: row.action.id,
          patientId: row.patient.id,
          eventType: "reviewed",
          createdBy: "provider",
          notes: communication,
        });
        if (input.followUp) {
          followUpId = crypto.randomUUID();
          await tx.insert(careActions).values({
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
          });
          await tx.insert(actionEvents).values({
            id: crypto.randomUUID(),
            careActionId: followUpId,
            patientId: row.patient.id,
            eventType: "follow_up_created",
            createdBy: "provider",
            notes: "Provider created a follow-up while reviewing the report.",
          });
        }
        await tx.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: row.action.id,
          patientId: row.patient.id,
          eventType: "closed",
          createdBy: "provider",
          notes: "Loop closed after completion, review, and next-step communication.",
        });
      });

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
        await ctx.db.transaction(async (tx) => {
          await tx.insert(careActions).values({
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
          await tx.insert(actionEvents).values({
            id: crypto.randomUUID(),
            careActionId: followUpId,
            patientId: plan.patientId,
            eventType: "follow_up_created",
            createdBy: "provider",
            notes: "Provider communicated and created a follow-up Care action.",
          });
          if (!parent) return;
          const shouldClose =
            parent.status !== "CLOSED" &&
            canCloseAction({
              status: parent.status,
              reviewRequired: parent.reviewRequired,
              nextStepCommunicated: true,
            });
          await tx
            .update(careActions)
            .set({
              nextStepCommunicated: true,
              status: shouldClose ? "CLOSED" : parent.status,
            })
            .where(eq(careActions.id, parent.id));
          if (shouldClose) {
            await tx.insert(actionEvents).values({
              id: crypto.randomUUID(),
              careActionId: parent.id,
              patientId: plan.patientId,
              eventType: "closed",
              createdBy: "provider",
              notes: "Loop closed after the Provider communicated the follow-up.",
            });
          }
        });

        return { id: followUpId, carePlanId: plan.id, parentActionId: parent?.id ?? null };
      }),
    resolveHelpRequest: providerProcedure
      .input(
        z.object({
          eventId: z.string().uuid(),
          resolution: z.string().trim().min(1).max(1_000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const request = await ctx.db.query.actionEvents.findFirst({
          where: eq(actionEvents.id, input.eventId),
        });
        if (request?.eventType !== "help_requested" || !request.patientId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Support request not found." });
        }
        await assertProviderPatientAccess(ctx.db, ctx.user.id, request.patientId);
        if (request.careActionId) {
          const [owned] = await ctx.db
            .select({ id: careActions.id })
            .from(careActions)
            .innerJoin(carePlans, eq(careActions.carePlanId, carePlans.id))
            .where(
              and(eq(careActions.id, request.careActionId), eq(carePlans.providerId, ctx.user.id)),
            )
            .limit(1);
          if (!owned) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Support request is not assigned to you.",
            });
          }
        }
        await ctx.db.insert(actionEvents).values({
          id: crypto.randomUUID(),
          careActionId: request.careActionId,
          patientId: request.patientId,
          eventType: "help_resolved",
          createdBy: "provider",
          notes: input.resolution,
        });
        return { eventId: request.id, resolved: true };
      }),
    listCareGaps: providerProcedure.input(careGapListSchema).query(async ({ ctx, input }) => {
      const dashboard = await buildProviderDashboard(ctx.db, ctx.user.id, input?.patientId);
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
