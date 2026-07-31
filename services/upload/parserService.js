/**
 * parserService.js
 *
 * WHY THIS FILE EXISTS:
 *   Text extraction logic is format-specific and should live in its own module,
 *   separate from chunking or embedding.  This service answers one question:
 *   "Given a Buffer and a MIME type, return the plain-text content."
 *
 * RESPONSIBILITY:
 *   - Accept a Buffer and mimeType.
 *   - Dispatch to the correct parser (pdf-parse, mammoth, or UTF-8 decode).
 *   - Return a plain-text string.
 *   - Throw a descriptive ParserServiceError on unsupported type or parse failure.
 *
 * SUPPORTED MIME TYPES:
 *   application/pdf
 *   application/vnd.openxmlformats-officedocument.wordprocessingml.document (DOCX)
 *   text/plain
 *   text/markdown
 */

import PdfParse from "pdf-parse";
import mammoth from "mammoth";

// ─── Custom error class ────────────────────────────────────────────────────────

export class ParserServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ParserServiceError";
    this.cause = cause ?? null;
  }
}

// ─── MIME type → parser map ───────────────────────────────────────────────────

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

// ─── Individual parsers ───────────────────────────────────────────────────────

/**
 * Extract text from a PDF buffer.
 * pdf-parse returns an object with a `.text` property.
 *
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function parsePdf(buffer) {
  try {
    const result = await PdfParse(buffer);
    if (!result.text || result.text.trim().length === 0) {
      throw new ParserServiceError(
        "PDF parsed successfully but no text content was found. " +
          "The file may be image-only or encrypted."
      );
    }
    return result.text;
  } catch (err) {
    if (err instanceof ParserServiceError) throw err;
    throw new ParserServiceError(`PDF parsing failed: ${err.message}`, err);
  }
}

/**
 * Extract raw text from a DOCX buffer using mammoth.
 * mammoth.extractRawText strips all formatting and returns plain text.
 *
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function parseDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });

    // mammoth may emit warnings; log them but don't fail
    if (result.messages && result.messages.length > 0) {
      const warnings = result.messages
        .filter((m) => m.type === "warning")
        .map((m) => m.message);
      if (warnings.length > 0) {
        console.warn("[parserService] DOCX parse warnings:", warnings);
      }
    }

    if (!result.value || result.value.trim().length === 0) {
      throw new ParserServiceError(
        "DOCX parsed successfully but no text content was found. " +
          "The file may be empty or contain only images."
      );
    }

    return result.value;
  } catch (err) {
    if (err instanceof ParserServiceError) throw err;
    throw new ParserServiceError(`DOCX parsing failed: ${err.message}`, err);
  }
}

/**
 * Decode a plain-text or Markdown buffer to a UTF-8 string.
 * Both MIME types are treated identically — raw text is returned as-is.
 *
 * @param {Buffer} buffer
 * @returns {string}
 */
function parsePlainText(buffer) {
  const text = buffer.toString("utf-8");
  if (!text || text.trim().length === 0) {
    throw new ParserServiceError(
      "Text file is empty — no content to process."
    );
  }
  return text;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract plain text from a file buffer.
 *
 * @param {Buffer} buffer   Raw file bytes (already read from upload)
 * @param {string} mimeType MIME type of the file
 * @returns {Promise<string>}  Plain-text content
 * @throws {ParserServiceError}
 */
export async function extractText(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ParserServiceError("extractText received an empty or invalid buffer.");
  }

  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    throw new ParserServiceError(
      `Unsupported file type "${mimeType}". ` +
        `Supported types: ${[...SUPPORTED_MIME_TYPES].join(", ")}`
    );
  }

  switch (mimeType) {
    case "application/pdf":
      return parsePdf(buffer);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return parseDocx(buffer);

    case "text/plain":
    case "text/markdown":
      return parsePlainText(buffer);

    default:
      // This branch is unreachable due to the set-check above, but satisfies linters
      throw new ParserServiceError(`No parser registered for "${mimeType}".`);
  }
}
