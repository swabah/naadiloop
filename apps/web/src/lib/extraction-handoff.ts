import { type DocumentExtractionResult, documentExtractionResultSchema } from "@naadi/api/schemas";

const keyPrefix = "naadi:provider-extraction:";

export function saveExtractionHandoff(result: DocumentExtractionResult): void {
  sessionStorage.setItem(`${keyPrefix}${result.carePlan.id}`, JSON.stringify(result));
}

export function loadExtractionHandoff(carePlanId: string): DocumentExtractionResult | null {
  const stored = sessionStorage.getItem(`${keyPrefix}${carePlanId}`);
  if (!stored) return null;

  try {
    return documentExtractionResultSchema.parse(JSON.parse(stored));
  } catch {
    sessionStorage.removeItem(`${keyPrefix}${carePlanId}`);
    return null;
  }
}
