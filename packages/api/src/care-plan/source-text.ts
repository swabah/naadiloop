function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function sourceTextAppearsIn(sourceText: string, sourceContent: string): boolean {
  const needle = normalize(sourceText);
  if (!needle) {
    return false;
  }
  return normalize(sourceContent).includes(needle);
}
