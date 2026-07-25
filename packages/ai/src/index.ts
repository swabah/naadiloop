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

function createOpenAiRequester(apiKey: string, model: string) {
  return async (prompt: string): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9_500);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "You are a literal medical-document extraction engine. Never provide clinical interpretation.",
            },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "care_action_extraction",
              strict: true,
              schema: extractionJsonSchema,
            },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI extraction request failed with status ${response.status}.`);
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned no extraction output.");
      }
      return content;
    } finally {
      clearTimeout(timeout);
    }
  };
}

export async function extractCareActions({
  sourceText,
  now = new Date(),
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4.1-mini",
  request,
}: ExtractionRequest): Promise<ExtractedCareAction[]> {
  const normalizedSource = sourceText.trim();
  if (!normalizedSource) {
    throw new Error("Source document text is required.");
  }

  if (!request && !apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const send = request ?? createOpenAiRequester(apiKey as string, model);
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
