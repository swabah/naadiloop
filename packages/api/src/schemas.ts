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

const optionalText = (schema: z.ZodString) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );

const optionalPhoneSchema = optionalText(
  z
    .string()
    .trim()
    .min(5, "Phone number must have at least 5 characters.")
    .max(32, "Phone number must have 32 characters or fewer."),
);

const optionalAgeSchema = optionalText(
  z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, "Age must be a whole number.")
    .refine(
      (value) => !/^\d{1,3}$/.test(value) || Number(value) <= 130,
      "Age must be 130 or less.",
    ),
);

export const patientCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Patient name is required.")
      .max(160, "Patient name must have 160 characters or fewer."),
    age: optionalAgeSchema,
    phone: optionalPhoneSchema,
    language: z.enum(["en", "ml", "hi"]).default("en"),
    caregiverContact: z
      .object({
        name: optionalText(
          z.string().trim().max(160, "Caregiver name must have 160 characters or fewer."),
        ),
        phone: optionalPhoneSchema,
      })
      .optional(),
  })
  .transform((patient) => {
    const caregiverContact =
      patient.caregiverContact?.name || patient.caregiverContact?.phone
        ? patient.caregiverContact
        : undefined;

    return { ...patient, caregiverContact };
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
