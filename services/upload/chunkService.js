/**
 * chunkService.js
 *
 * WHY THIS FILE EXISTS:
 *   Chunking is a distinct algorithmic concern: how to split a long text into
 *   overlapping windows that fit within an embedding model's context window.
 *   Keeping it separate means you can swap the chunking strategy (e.g. switch
 *   to sentence-aware splitting) without touching the parser or embedding layers.
 *
 * RESPONSIBILITY:
 *   - Accept a plain-text string.
 *   - Return an array of overlapping text chunks.
 *   - Filter out empty or whitespace-only chunks.
 *   - Throw a descriptive ChunkServiceError if input is invalid.
 *
 * STRATEGY:
 *   Sliding window with overlap.
 *   - chunkSize  = 500 characters  (fits comfortably in text-embedding-3-small)
 *   - overlap    = 100 characters  (preserves context across chunk boundaries)
 *
 *   Window advances by (chunkSize - overlap) = 400 characters each step,
 *   so every chunk shares 100 characters with its neighbours.
 */

// ─── Custom error class ────────────────────────────────────────────────────────

export class ChunkServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ChunkServiceError";
    this.cause = cause ?? null;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of characters per chunk */
const DEFAULT_CHUNK_SIZE = 500;

/** Characters shared between consecutive chunks */
const DEFAULT_OVERLAP = 100;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Split a plain-text string into overlapping chunks.
 *
 * @param {string} text                     Extracted plain text from parserService
 * @param {object} [options]
 * @param {number} [options.chunkSize=500]  Characters per chunk
 * @param {number} [options.overlap=100]    Characters of overlap between chunks
 * @returns {string[]}  Array of non-empty text chunks
 * @throws {ChunkServiceError}
 */
export function chunkText(text, { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = {}) {
  if (typeof text !== "string") {
    throw new ChunkServiceError("chunkText expects a string, received: " + typeof text);
  }

  if (text.trim().length === 0) {
    throw new ChunkServiceError("chunkText received an empty string — nothing to chunk.");
  }

  if (overlap >= chunkSize) {
    throw new ChunkServiceError(
      `overlap (${overlap}) must be less than chunkSize (${chunkSize}).`
    );
  }

  const step = chunkSize - overlap;
  const chunks = [];

  for (let i = 0; i < text.length; i += step) {
    const chunk = text.slice(i, i + chunkSize);

    // Skip chunks that are only whitespace (e.g. page-break artifacts in PDFs)
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  if (chunks.length === 0) {
    throw new ChunkServiceError(
      "Chunking produced 0 non-empty chunks. The document may contain only whitespace."
    );
  }

  return chunks;
}
