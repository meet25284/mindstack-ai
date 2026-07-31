/**
 * embeddingService.js
 *
 * WHY THIS FILE EXISTS:
 *   Embedding generation is an external API call (OpenAI) with its own failure
 *   modes (rate-limiting, token limits, network errors).  Isolating it here means
 *   the route handler can catch EmbeddingServiceError specifically, keep the
 *   already-uploaded Cloudinary file, and mark the document as FAILED — rather
 *   than treating it the same as a validation error.
 *
 *   This service intentionally does NOT use the shared `usage` Map in
 *   services/model.js because that Map tracks per-request chat usage and its
 *   state would bleed across upload calls running in concurrent requests.
 *   Instead, we return the token count directly to the caller.
 *
 * RESPONSIBILITY:
 *   - Accept a string[] of text chunks.
 *   - Call OpenAI text-embedding-3-small via the AI SDK's embedMany().
 *   - Return { embeddings: number[][], totalTokens: number }.
 *   - Throw EmbeddingServiceError on failure.
 *
 * MODEL:
 *   text-embedding-3-small  →  1536-dimensional float vectors
 *   (must match your MongoDB Atlas Vector Search index configuration)
 */

import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// ─── Custom error class ────────────────────────────────────────────────────────

export class EmbeddingServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "EmbeddingServiceError";
    this.cause = cause ?? null;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * The embedding model to use.
 * text-embedding-3-small outputs 1536-dimensional vectors.
 * Make sure your Atlas Vector Search index uses numDimensions: 1536.
 */
const EMBEDDING_MODEL = openai.embeddingModel("text-embedding-3-small");

/**
 * Maximum number of chunks to send in a single embedMany() call.
 * OpenAI allows up to 2048 inputs per request; we stay conservative.
 */
const BATCH_SIZE = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split an array into fixed-size batches.
 *
 * @param {string[]} arr
 * @param {number} size
 * @returns {string[][]}
 */
function batchArray(arr, size) {
  const batches = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate embeddings for an array of text chunks.
 *
 * Sends chunks in batches of BATCH_SIZE to avoid hitting OpenAI request limits.
 * Returns all embeddings in original order along with the total token count.
 *
 * @param {string[]} chunks  Text chunks from chunkService
 * @returns {Promise<{ embeddings: number[][], totalTokens: number }>}
 * @throws {EmbeddingServiceError}
 */
export async function generateEmbeddings(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new EmbeddingServiceError(
      "generateEmbeddings received an empty or invalid chunks array."
    );
  }

  const allEmbeddings = [];
  let totalTokens = 0;

  const batches = batchArray(chunks, BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      const { embeddings, usage } = await embedMany({
        model: EMBEDDING_MODEL,
        values: batch,
      });

      allEmbeddings.push(...embeddings);
      totalTokens += usage?.tokens ?? 0;
    } catch (err) {
      throw new EmbeddingServiceError(
        `Embedding generation failed at batch ${batchIndex + 1}/${batches.length}: ${err.message}`,
        err
      );
    }
  }

  // Sanity check: each chunk must have exactly one embedding
  if (allEmbeddings.length !== chunks.length) {
    throw new EmbeddingServiceError(
      `Embedding count mismatch: expected ${chunks.length}, received ${allEmbeddings.length}.`
    );
  }

  return { embeddings: allEmbeddings, totalTokens };
}
