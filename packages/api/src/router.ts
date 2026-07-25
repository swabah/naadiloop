import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { organizationDetails, patients, users } from "@naadi/db";
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
import { protectedProcedure, publicProcedure, router, superAdminProcedure } from "./trpc";

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

      const userIds = pendingUsers.map((u) => u.id);
      const orgs = userIds.length > 0
        ? await ctx.db.query.organizationDetails.findMany({
            where: (org, { inArray }) => inArray(org.userId, userIds),
          })
        : [];

      const orgMap = new Map(orgs.map((o) => [o.userId, o]));

      return pendingUsers.map((user) => ({
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
    list: protectedProcedure.query(notImplemented),
    create: protectedProcedure.input(patientCreateSchema).mutation(notImplemented),
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
