import { z } from "zod";

export const documentTypeSchema = z.enum([
  "discharge_summary",
  "prescription",
  "referral",
  "lab_form",
  "other",
]);

export const actionTypeSchema = z.enum(["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"]);
export const prioritySchema = z.enum(["NORMAL", "URGENT"]);

const actionBase = {
  title: z.string().trim().min(1).max(160),
  instructions: z.string().trim().min(1).max(2_000),
  dueDate: z.string().datetime({ offset: true }).optional(),
  priority: prioritySchema.default("NORMAL"),
  sourceText: z.string().trim().min(1).max(4_000),
  assignedTo: z.string().trim().min(1).max(120).default("patient"),
  reviewRequired: z.boolean().default(false),
};

export const medicationActionSchema = z.object({
  ...actionBase,
  type: z.literal("MEDICATION"),
  payload: z
    .object({
      schedule: z.string().trim().min(1).max(240).optional(),
      durationDays: z.number().int().positive().max(365).optional(),
    })
    .default({}),
});

export const testActionSchema = z.object({
  ...actionBase,
  type: z.literal("TEST"),
  payload: z
    .object({
      testName: z.string().trim().min(1).max(160).optional(),
    })
    .default({}),
});

export const referralActionSchema = z.object({
  ...actionBase,
  type: z.literal("REFERRAL"),
  payload: z
    .object({
      specialty: z.string().trim().min(1).max(160).optional(),
    })
    .default({}),
});

export const followUpActionSchema = z.object({
  ...actionBase,
  type: z.literal("FOLLOW_UP"),
  payload: z
    .object({
      reason: z.string().trim().min(1).max(500).optional(),
    })
    .default({}),
});

export const careActionSchema = z.discriminatedUnion("type", [
  medicationActionSchema,
  testActionSchema,
  referralActionSchema,
  followUpActionSchema,
]);

export const patientIdSchema = z.object({ patientId: z.string().uuid() });
export const actionIdSchema = z.object({ actionId: z.string().uuid() });
export const carePlanIdSchema = z.object({ carePlanId: z.string().uuid() });

export const patientCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  age: z.string().trim().min(1).max(3).optional(),
  phone: z.string().trim().min(5).max(32).optional(),
  language: z.string().trim().min(2).max(12).default("en"),
  caregiverContact: z
    .object({
      name: z.string().trim().min(1).max(160).optional(),
      phone: z.string().trim().min(5).max(32).optional(),
    })
    .optional(),
});

export const documentInputSchema = z.object({
  patientId: z.string().uuid(),
  type: documentTypeSchema,
  content: z.string().trim().min(1).max(100_000),
});

export const completeActionSchema = z.object({
  actionId: z.string().uuid(),
  outcome: z.enum(["taken", "skipped", "help"]),
  notes: z.string().trim().max(1_000).optional(),
});

export const helpRequestSchema = z.object({
  actionId: z.string().uuid(),
  kind: z.enum(["caregiver", "transport", "understanding", "provider"]),
  notes: z.string().trim().max(1_000).optional(),
});

export const uploadReportSchema = z.object({
  actionId: z.string().uuid(),
  fileUrl: z.string().url(),
});

export const reviewReportSchema = z.object({
  reportId: z.string().uuid(),
  comment: z.string().trim().max(2_000).optional(),
  followUp: followUpActionSchema.optional(),
});

export const verifyCarePlanSchema = z.object({
  carePlanId: z.string().uuid(),
  actions: z.array(careActionSchema).min(1).max(50),
});

export const careGapListSchema = z
  .object({
    patientId: z.string().uuid().optional(),
  })
  .optional();
