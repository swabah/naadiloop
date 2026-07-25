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

export const documentExtractionResultSchema = z.object({
  document: z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    documentType: documentTypeSchema,
    content: z.string(),
    uploadedAt: z.string().datetime({ offset: true }),
  }),
  patient: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  carePlan: z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    providerId: z.string().uuid(),
    status: z.literal("draft"),
    createdAt: z.string().datetime({ offset: true }),
  }),
  actions: z.array(
    careActionSchema.and(
      z.object({
        id: z.string().uuid(),
        carePlanId: z.string().uuid(),
        status: z.literal("PENDING"),
        verified: z.literal(false),
        createdAt: z.string().datetime({ offset: true }),
      }),
    ),
  ),
});

export type DocumentExtractionResult = z.infer<typeof documentExtractionResultSchema>;

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
      if (data.role === "patient") {
        return !!data.aadhaarNumber && /^\d{12}$/.test(data.aadhaarNumber.replace(/\s+/g, ""));
      }
      return true;
    },
    {
      message: "12-digit Aadhaar number is required for patient registration",
      path: ["aadhaarNumber"],
    },
  )
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
  );

export const loginInputSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const adminApprovalSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  action: z.enum(["approve", "reject"]),
});
