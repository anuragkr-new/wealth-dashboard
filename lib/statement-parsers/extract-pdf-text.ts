import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

export type ExtractPdfTextOptions = {
  /** Used only in memory for this request; never persisted. */
  password?: string;
};

export class PdfPasswordError extends Error {
  constructor(
    message: string,
    public readonly kind: "need_password" | "incorrect_password"
  ) {
    super(message);
    this.name = "PdfPasswordError";
  }
}

function isPasswordException(e: unknown): e is { name: string; code: number; message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "name" in e &&
    (e as { name: string }).name === "PasswordException" &&
    "code" in e &&
    typeof (e as { code: unknown }).code === "number"
  );
}

/** Match pdf-parse row grouping: same transform[5] → same line. */
function textFromPageContent(items: { str?: string; transform?: number[] }[]): string {
  let text = "";
  let lastY: number | undefined;
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const tr = item.transform;
    if (!tr || tr.length < 6) continue;
    const y = tr[5]!;
    const str = item.str ?? "";
    if (lastY === y || lastY === undefined) {
      text += str;
    } else {
      text += "\n" + str;
    }
    lastY = y;
  }
  return text;
}

function mapPasswordFailure(e: unknown, PasswordResponses: { NEED_PASSWORD: number; INCORRECT_PASSWORD: number }): never {
  if (!isPasswordException(e)) throw e;
  if (e.code === PasswordResponses.NEED_PASSWORD) {
    throw new PdfPasswordError(
      "This PDF is password-protected. Enter the PDF password (it is only used for this upload).",
      "need_password"
    );
  }
  if (e.code === PasswordResponses.INCORRECT_PASSWORD) {
    throw new PdfPasswordError("Incorrect PDF password.", "incorrect_password");
  }
  throw e;
}

/**
 * Extract plain text from a PDF buffer using pdf.js (legacy Node build).
 * Supports optional password; never logs or stores the password.
 */
export async function extractPdfText(
  buffer: Buffer,
  options?: ExtractPdfTextOptions
): Promise<string> {
  const { getDocument, PasswordResponses } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(buffer);
  const password = options?.password?.length ? options.password : undefined;

  const loadingTask = getDocument({
    data,
    password,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  });

  let pdf: PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch (e) {
    mapPasswordFailure(e, PasswordResponses);
  }

  try {
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      parts.push(
        textFromPageContent(textContent.items as { str?: string; transform?: number[] }[])
      );
    }
    return parts.join("\n\n");
  } finally {
    await pdf.cleanup().catch(() => undefined);
  }
}
