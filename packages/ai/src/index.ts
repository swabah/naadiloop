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

export const DEFAULT_EXTRACTION_MODEL = "gemini-3.5-flash-lite";

function supportedModel(model: string): string {
  return model === "gemini-2.5-flash" ? DEFAULT_EXTRACTION_MODEL : model;
}

function safeExtractionServiceError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/(?:404|not[_ ]found|no longer available)/i.test(message) && /model|gemini/i.test(message)) {
    return new Error(
      "AI extraction is temporarily unavailable because the configured model is not supported. Retry or continue with manual entry.",
    );
  }
  if (/(?:429|resource[_ ]exhausted|quota|rate limit)/i.test(message)) {
    return new Error(
      "AI extraction is temporarily busy or has reached its usage limit. Retry shortly or continue with manual entry.",
    );
  }
  if (/timeout|timed out|deadline/i.test(message)) {
    return new Error(
      "AI extraction timed out. Your document is saved; retry or continue with manual entry.",
    );
  }
  return new Error(
    "AI extraction could not be completed. Your document is saved; retry or continue with manual entry.",
  );
}

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["actions"],
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "instructions", "dueDate", "priority", "sourceText"],
        properties: {
          type: {
            type: "string",
            enum: ["MEDICATION", "TEST", "REFERRAL", "FOLLOW_UP"],
            description: "The single Care action category that best matches the instruction.",
          },
          title: {
            type: "string",
            description: "A short action title, no more than 160 characters.",
          },
          instructions: {
            type: "string",
            description: "Literal instructions from the source, no more than 2000 characters.",
          },
          dueDate: {
            anyOf: [
              {
                type: "string",
                format: "date-time",
                description: "An RFC 3339 timestamp with a timezone offset.",
              },
              { type: "null" },
            ],
          },
          priority: { type: "string", enum: ["NORMAL", "URGENT"] },
          sourceText: {
            type: "string",
            description:
              "One exact, contiguous quote copied from the source document, no more than 4000 characters.",
          },
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
    "Resolve explicit relative dates against the supplied current timestamp.",
    "Return dueDate as an RFC 3339 date-time with a Z or numeric timezone offset. Use null when no due date is stated.",
    "Do not invent missing details. Return every explicit trackable instruction once.",
    `Current timestamp: ${now.toISOString()}`,
    "",
    "<source_document>",
    sourceText,
    "</source_document>",
  ].join("\n");
}

function normalizeDueDate(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  return trimmed;
}

function normalizeExtractionPayload(parsed: unknown): unknown {
  const container = Array.isArray(parsed) ? { actions: parsed } : parsed;
  if (!container || typeof container !== "object" || !("actions" in container)) {
    return container;
  }

  const actions = (container as { actions: unknown }).actions;
  if (!Array.isArray(actions)) return container;

  return {
    actions: actions.map((action) => {
      if (!action || typeof action !== "object") return action;
      const candidate = action as Record<string, unknown>;
      return {
        type:
          typeof candidate.type === "string" ? candidate.type.trim().toUpperCase() : candidate.type,
        title:
          typeof candidate.title === "string"
            ? candidate.title.trim().slice(0, 160)
            : candidate.title,
        instructions:
          typeof candidate.instructions === "string"
            ? candidate.instructions.trim().slice(0, 2_000)
            : candidate.instructions,
        dueDate: normalizeDueDate(candidate.dueDate),
        priority:
          typeof candidate.priority === "string"
            ? candidate.priority.trim().toUpperCase()
            : candidate.priority,
        sourceText:
          typeof candidate.sourceText === "string"
            ? candidate.sourceText.trim().slice(0, 4_000)
            : candidate.sourceText,
      };
    }),
  };
}

function parseAndValidate(raw: string, sourceText: string): ExtractedCareAction[] {
  let parsed: unknown;
  try {
    const trimmed = raw.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    parsed = normalizeExtractionPayload(JSON.parse(fenced?.[1] ?? trimmed));
  } catch {
    throw new Error("The extraction service returned invalid JSON.");
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "actions" in parsed &&
    Array.isArray((parsed as { actions: unknown }).actions) &&
    (parsed as { actions: unknown[] }).actions.length === 0
  ) {
    throw new Error("No explicit trackable Care actions were found in this document.");
  }

  const output = extractionOutputSchema.safeParse(parsed);
  if (!output.success) {
    const issuePath = output.error.issues[0]?.path.join(".");
    const suffix = issuePath ? ` The invalid field was "${issuePath}".` : "";
    throw new Error(`The extraction service returned an invalid Care action structure.${suffix}`);
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
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction:
          "You are a literal medical-document extraction engine. Never provide clinical interpretation.",
        responseMimeType: "application/json",
        responseJsonSchema: extractionJsonSchema,
        httpOptions: {
          timeout: 9_500,
          retryOptions: {
            attempts: 1,
          },
        },
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned no extraction output.");
    }

    return response.text;
  };
}

export async function extractCareActions({
  sourceText,
  now = new Date(),
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_EXTRACTION_MODEL ?? DEFAULT_EXTRACTION_MODEL,
  request,
}: ExtractionRequest): Promise<ExtractedCareAction[]> {
  const normalizedSource = sourceText.trim();
  if (!normalizedSource) {
    throw new Error("Source document text is required.");
  }

  if (!request && !apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const send = request ?? createGeminiRequester(apiKey as string, supportedModel(model));
  const prompt = buildPrompt(normalizedSource, now);
  let requestPrompt = prompt;

  let firstValidationError: Error | undefined;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let raw: string;
    try {
      raw = await send(requestPrompt);
    } catch (error) {
      throw safeExtractionServiceError(error);
    }
    try {
      return parseAndValidate(raw, normalizedSource);
    } catch (error) {
      firstValidationError =
        error instanceof Error ? error : new Error("Invalid extraction output.");
      requestPrompt = [
        prompt,
        "",
        "<validation_correction>",
        "Your previous response failed application validation.",
        "Return only the required object and action fields, with no additional fields.",
        "Every dueDate must be null or an RFC 3339 date-time containing Z or a numeric timezone offset.",
        "Every sourceText must be copied exactly from the source document.",
        "</validation_correction>",
      ].join("\n");
    }
  }

  throw firstValidationError ?? new Error("The extraction output could not be validated.");
}
