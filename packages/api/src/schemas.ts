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
export const uhidSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^UHID-[A-Z0-9]{10,40}$/, "Enter a valid UHID.");
export const patientLookupSchema = z.object({ uhid: uhidSchema });
export const patientLinkSchema = patientLookupSchema.extend({
  otp: z.string().regex(/^\d{6}$/, "Enter the six-digit OTP."),
});

export const documentInputSchema = z.object({
  patientId: z.string().uuid(),
  type: documentTypeSchema,
  content: z.string().trim().min(1).max(100_000),
});

export const completeActionSchema = z.object({
  actionId: z.string().uuid(),
  outcome: z.enum(["completed", "taken", "skipped", "remind", "help"]),
  notes: z.string().trim().max(1_000).optional(),
});

export const helpRequestSchema = z
  .object({
    actionId: z.string().uuid().optional(),
    patientId: z.string().uuid().optional(),
    kind: z.enum(["caregiver", "transport", "understanding", "provider"]),
    notes: z.string().trim().max(1_000).optional(),
  })
  .refine((input) => input.actionId || input.patientId, {
    message: "Choose a Care action or Patient for this help request.",
  });

export const uploadReportSchema = z.object({
  actionId: z.string().uuid(),
  file: z.object({
    name: z.string().trim().min(1).max(255),
    type: z.string().trim().min(1).max(160),
    size: z.number().int().positive().max(10_000_000),
  }),
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

export const userRoleSchema = z.enum([
  "patient",
  "hospital_admin",
  "pharmacy_admin",
  "super_admin",
]);

export const registerInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(160),
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().trim().optional(),
    role: z.enum(["patient", "hospital_admin", "pharmacy_admin"]),
    // Patient specific
    aadhaarNumber: z.string().trim().optional(),
    age: z.string().trim().optional(),
    gender: z.string().trim().optional(),
    language: z.string().trim().default("en"),
    // Organization specific (Hospital / Pharmacy)
    orgName: z.string().trim().optional(),
    licenseNumber: z.string().trim().optional(),
    address: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.role === "hospital_admin" || data.role === "pharmacy_admin") {
        return !!data.orgName && !!data.licenseNumber;
      }
      return true;
    },
    {
      message: "Organization name and license number are required for administration registration",
      path: ["orgName"],
    },
  )
  .refine((data) => data.role !== "patient" || Boolean(data.phone), {
    message: "A phone number is required so a Hospital can request Patient consent.",
    path: ["phone"],
  })
  .refine(
    (data) =>
      data.role !== "patient" || /^\d{12}$/.test(data.aadhaarNumber?.replace(/\s/g, "") ?? ""),
    {
      message: "12-digit Aadhaar number is required for patient registration",
      path: ["aadhaarNumber"],
    },
  );

export const loginInputSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const adminApprovalSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  action: z.enum(["approve", "reject"]),
});
