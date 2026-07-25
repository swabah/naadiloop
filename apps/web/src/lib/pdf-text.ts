import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const maximumDocumentLength = 100_000;

export async function extractDigitalPdfText(file: File): Promise<string> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Choose a PDF file.");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) pages.push(text);
    }

    const extracted = pages.join("\n\n").trim();
    if (!extracted) {
      throw new Error(
        "No embedded text was found. Scanned PDFs need OCR; paste the instructions or enter actions manually.",
      );
    }
    if (extracted.length > maximumDocumentLength) {
      throw new Error("This PDF is too long. Use a document with 100,000 characters or fewer.");
    }
    return extracted;
  } finally {
    await loadingTask.destroy();
  }
}
