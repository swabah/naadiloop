import { type ExtractedCareAction, extractCareActions } from "@naadi/ai";
import {
  actionEvents,
  careActions,
  carePlans,
  eq,
  organizationDetails,
  patients,
  reports,
  sourceDocuments,
  users,
} from "@naadi/db";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import {
  actionIdSchema,
  adminApprovalSchema,
  careActionSchema,
  careGapListSchema,
  carePlanIdSchema,
  completeActionSchema,
  documentInputSchema,
  helpRequestSchema,
  loginInputSchema,
  patientCreateSchema,
  patientIdSchema,
  registerInputSchema,
  reviewReportSchema,
  uploadReportSchema,
  verifyCarePlanSchema,
} from "./schemas";

import { protectedProcedure, providerProcedure, publicProcedure, router, superAdminProcedure } from "./trpc";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-naadi-jwt-key-2026";

function notImplemented(): never {
  throw new TRPCError({
    code: "NOT_IMPLEMENTED",
    message: "This procedure is contracted in ISSUE-001 and implemented in a later issue.",
  });
}

export const appRouter = router({
  auth: router({
    register: publicProcedure.input(registerInputSchema).mutation(async ({ ctx, input }) => {
      // 1. Check if email exists
      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email address already exists.",
        });
      }

      // 2. If patient, check Aadhaar uniqueness
      if (input.role === "patient" && input.aadhaarNumber) {
        const cleanAadhaar = input.aadhaarNumber.replace(/\s+/g, "");
        const existingAadhaar = await ctx.db.query.users.findFirst({
          where: eq(users.aadhaarNumber, cleanAadhaar),
        });
        if (existingAadhaar) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A patient with this Aadhaar number is already registered.",
          });
        }
      }

      // 3. Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);
      const userStatus = input.role === "patient" ? "active" : "pending_approval";

      // 4. Insert User
      const [newUser] = await ctx.db
        .insert(users)
        .values({
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          phone: input.phone,
          role: input.role,
          status: userStatus,
          aadhaarNumber: input.role === "patient" ? input.aadhaarNumber?.replace(/\s+/g, "") : null,
        })
        .returning();

      if (!newUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user record." });
      }

      // 5. Insert role-specific profile details
      if (input.role === "patient") {
        await ctx.db.insert(patients).values({
          id: newUser.id,
          name: input.name,
          age: input.age || null,
          phone: input.phone || null,
          language: input.language || "en",
        });
      } else if (input.role === "hospital_admin" || input.role === "pharmacy_admin") {
        const orgType = input.role === "hospital_admin" ? "hospital" : "pharmacy";
        await ctx.db.insert(organizationDetails).values({
          userId: newUser.id,
          orgName: input.orgName || `${input.name}'s Facility`,
          orgType,
          licenseNumber: input.licenseNumber || "PENDING",
          address: input.address,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
        });
      }


      const message =
        input.role === "patient"
          ? "Registration successful! You can now log in."
          : "Registration submitted successfully! Your administration account is pending Super Admin approval.";

      return {
        success: true,
        message,
        status: userStatus,
      };
    }),

    login: publicProcedure.input(loginInputSchema).mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      if (user.status === "pending_approval") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your administration account is pending Super Admin approval. Please try again after approval.",
        });
      }

      if (user.status === "rejected") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your administration account registration was rejected by Super Admin.",
        });
      }

      const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

      return {
        token,
        user: payload,
      };
    }),

    me: protectedProcedure.query(({ ctx }) => {
      return {
        user: ctx.user,
      };
    }),
  }),

  admin: router({
    pendingApprovals: superAdminProcedure.query(async ({ ctx }) => {
      const pendingUsers = await ctx.db.query.users.findMany({
        where: eq(users.status, "pending_approval"),
      });

      const userIds = pendingUsers.map((u: typeof users.$inferSelect) => u.id);
      const orgs = userIds.length > 0
        ? await ctx.db.query.organizationDetails.findMany()
        : [];

      const filteredOrgs = orgs.filter((o: typeof organizationDetails.$inferSelect) => userIds.includes(o.userId));
      const orgMap = new Map(filteredOrgs.map((o: typeof organizationDetails.$inferSelect) => [o.userId, o]));

      return pendingUsers.map((user: typeof users.$inferSelect) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        organization: orgMap.get(user.id) || null,
      }));

    }),

    approveUser: superAdminProcedure.input(adminApprovalSchema).mutation(async ({ ctx, input }) => {
      const newStatus = input.action === "approve" ? "active" : "rejected";
      const [updated] = await ctx.db
        .update(users)
        .set({ status: newStatus })
        .where(eq(users.id, input.userId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
      }

      return {
        success: true,
        userId: updated.id,
        status: updated.status,
      };
    }),
  }),

  patient: router({
    list: providerProcedure.query(({ ctx }) =>
      ctx.db.query.patients.findMany(),
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
        where: eq(patients.id, input.patientId),
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
          where: eq(sourceDocuments.id, input.documentId),
        });
        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "The source document could not be found.",
          });
        }

        const patient = await ctx.db.query.patients.findFirst({
          where: eq(patients.id, document.patientId),
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
          actions: actions.map((action: typeof careActions.$inferSelect) => ({
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
