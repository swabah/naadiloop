import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const extractedActionSchema = z
  .object({
    type: z.enum(["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"]),
    title: z.string().trim().min(1).max(160),
    instructions: z.string().trim().min(1).max(2_000),
    dueDate: z.string().datetime({ offset: true }).nullable(),
    priority: z.enum(["NORMAL", "URGENT"]),
    sourceText: z.string().trim().min(1).max(4_000),
  })
  .strict();

export const extractionOutputSchema = z
  .object({
    actions: z.array(extractedActionSchema).min(1).max(50),
  })
  .strict();

export type ExtractedCareAction = z.infer<typeof extractedActionSchema>;

export interface ExtractionRequest {
  sourceText: string;
  now?: Date;
  apiKey?: string;
  model?: string;
  request?: (prompt: string) => Promise<string>;
}

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["actions"],
  properties: {
    actions: {
      type: "array",
      minItems: 1,
      maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "instructions", "dueDate", "priority", "sourceText"],
        properties: {
          type: {
            type: "string",
            enum: ["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"],
          },
          title: { type: "string", minLength: 1, maxLength: 160 },
          instructions: { type: "string", minLength: 1, maxLength: 2000 },
          dueDate: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          priority: { type: "string", enum: ["NORMAL", "URGENT"] },
          sourceText: { type: "string", minLength: 1, maxLength: 4000 },
        },
      },
    },
  },
} as const;

function buildPrompt(sourceText: string, now: Date): string {
  return [
    "Extract trackable Care actions from the medical instruction document below.",
    "Extraction only: do not diagnose, interpret labs, recommend treatment, score risk, or infer urgency.",
    "Use only MEDICATION, TEST, REFERRAL, or FOLLOW_UP.",
    "Copy sourceText verbatim as one contiguous substring of the document.",
    "Use NORMAL priority unless the source explicitly labels that instruction urgent.",
    "Resolve explicit relative dates against the supplied current timestamp. Use null when no due date is stated.",
    "Do not invent missing details. Return every explicit trackable instruction once.",
    `Current timestamp: ${now.toISOString()}`,
    "",
    "<source_document>",
    sourceText,
    "</source_document>",
  ].join("\n");
}

function parseAndValidate(raw: string, sourceText: string): ExtractedCareAction[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The extraction service returned invalid JSON.");
  }

  const output = extractionOutputSchema.safeParse(parsed);
  if (!output.success) {
    throw new Error("The extraction service returned an invalid Care action structure.");
  }

  const untraceableAction = output.data.actions.find(
    (action) => !sourceText.includes(action.sourceText),
  );
  if (untraceableAction) {
    throw new Error(`The source quote for "${untraceableAction.title}" is not traceable.`);
  }

  return output.data.actions;
}

function createGeminiRequester(apiKey: string, model: string) {
  const client = new GoogleGenAI({ apiKey });

  return async (prompt: string): Promise<string> => {
    const interaction = await client.interactions.create(
      {
        model,
        input: prompt,
        system_instruction:
          "You are a literal medical-document extraction engine. Never provide clinical interpretation.",
        generation_config: {
          temperature: 0,
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: extractionJsonSchema,
        },
      },
      {
        timeout: 9_500,
        maxRetries: 0,
      },
    );

    if (!interaction.output_text) {
      throw new Error("Gemini returned no extraction output.");
    }

    return interaction.output_text;
  };
}

export async function extractCareActions({
  sourceText,
  now = new Date(),
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_EXTRACTION_MODEL ?? "gemini-2.5-flash",
  request,
}: ExtractionRequest): Promise<ExtractedCareAction[]> {
  const normalizedSource = sourceText.trim();
  if (!normalizedSource) {
    throw new Error("Source document text is required.");
  }

  if (!request && !apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const send = request ?? createGeminiRequester(apiKey as string, model);
  const prompt = buildPrompt(normalizedSource, now);

  let firstValidationError: Error | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await send(prompt);
    try {
      return parseAndValidate(raw, normalizedSource);
    } catch (error) {
      firstValidationError =
        error instanceof Error ? error : new Error("Invalid extraction output.");
    }
  }

  throw firstValidationError ?? new Error("The extraction output could not be validated.");
}
