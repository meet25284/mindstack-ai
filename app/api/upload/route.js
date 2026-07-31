/**
 * app/api/upload/route.js
 *
 * WHY THIS FILE EXISTS:
 *   This is the single HTTP entry point for the file-upload pipeline.
 *   It is intentionally thin: it validates inputs, orchestrates service calls
 *   in the correct order, and handles partial-failure scenarios — nothing more.
 *   Every non-trivial operation is delegated to a purpose-built service.
 *
 * PIPELINE (happy path):
 *   1. Authenticate the request (JWT → User)
 *   2. Parse multipart/form-data → file + title
 *   3. Validate file size (≤ 10 MB) and MIME type
 *   4. Read file bytes into a Buffer
 *   5. Upload Buffer to Cloudinary           [uploadService]
 *   6. Create a "PENDING" File doc in MongoDB [dbService]
 *   7. Extract plain text from the Buffer     [parserService]
 *   8. Chunk the text                         [chunkService]
 *   9. Generate embeddings for each chunk     [embeddingService]
 *  10. Bulk-insert embeddings into vector DB  [dbService]
 *  11. Update File doc → READY               [dbService]
 *  12. Return 201 JSON response
 *
 * PARTIAL FAILURE (steps 7–11):
 *   If any step after the Cloudinary upload fails, the uploaded file is kept
 *   (no orphan cleanup — Cloudinary storage is cheap and auditable).
 *   The File doc is updated to FAILED with an error message, and the route
 *   returns HTTP 207 (Multi-Status) so the client knows the upload succeeded
 *   but processing did not.
 */

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/middleware/auth";
import { uploadToCloudinary, UploadServiceError } from "@/services/upload/uploadService";
import { extractText, ParserServiceError } from "@/services/upload/parserService";
import { chunkText, ChunkServiceError } from "@/services/upload/chunkService";
import { generateEmbeddings, EmbeddingServiceError } from "@/services/upload/embeddingService";
import {
  createKnowledgeDoc,
  updateKnowledgeStatus,
  storeEmbeddings,
  DbServiceError,
} from "@/services/upload/dbService";
import { PROCESSING_STATUS } from "@/models/files";

// ─── Configuration ────────────────────────────────────────────────────────────

/** Maximum allowed file size: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types — any other type will be rejected with 415 */
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a standardised error response.
 *
 * @param {string} message  Human-readable error description
 * @param {number} status   HTTP status code
 * @param {object} [extra]  Optional additional fields merged into the body
 */
function errorResponse(message, status, extra = {}) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status }
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  // ── Step 1: Authentication ─────────────────────────────────────────────────
  let user;
  try {
    user = await isAuthenticated(request);
  } catch (err) {
    return errorResponse("Unauthorized — valid Bearer token required.", 401);
  }

  // isAuthenticated can return a NextResponse when the token is invalid/missing
  if (!user || typeof user.status === "number") {
    return errorResponse("Unauthorized — invalid or expired token.", 401);
  }

  // ── Step 2: Parse multipart/form-data ──────────────────────────────────────
  let formData;
  try {
    formData = await request.formData();
  } catch (err) {
    return errorResponse(
      "Failed to parse request body. Make sure you are sending multipart/form-data.",
      400
    );
  }

  const file = formData.get("document");
  const title = formData.get("title");

  // ── Step 3: Input validation ───────────────────────────────────────────────
  if (!file || file === "null" || !(file instanceof File || typeof file.arrayBuffer === "function")) {
    return errorResponse('No file found. Send the file under the field name "document".', 400);
  }

  if (!title || title.toString().trim() === "" || title === "null") {
    return errorResponse('A "title" field is required.', 400);
  }

  const mimeType = file.type;
  const originalFileName = file.name || "upload";
  const fileSize = file.size;

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return errorResponse(
      `File type "${mimeType}" is not allowed. Accepted types: PDF, DOCX, TXT, Markdown.`,
      415
    );
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return errorResponse(
      `File is too large (${(fileSize / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 10 MB.`,
      413
    );
  }

  // ── Step 4: Read file bytes into Buffer ────────────────────────────────────
  let buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    return errorResponse("Failed to read uploaded file bytes.", 500);
  }

  // ── Step 5: Upload to Cloudinary ───────────────────────────────────────────
  let cloudinaryResult;
  try {
    cloudinaryResult = await uploadToCloudinary(buffer, mimeType, originalFileName);
  } catch (err) {
    if (err instanceof UploadServiceError) {
      console.error("[upload/route] Cloudinary upload error:", err);
      return errorResponse(
        "File upload to cloud storage failed. Please try again.",
        502
      );
    }
    console.error("[upload/route] Unexpected upload error:", err);
    return errorResponse("An unexpected error occurred during upload.", 500);
  }

  // ── Step 6: Create a PENDING knowledge document in MongoDB ─────────────────
  let knowledgeDoc;
  try {
    knowledgeDoc = await createKnowledgeDoc({
      title: title.toString().trim(),
      originalFileName,
      cloudinaryUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      mimeType,
      size: cloudinaryResult.bytes,
      uploadedBy: user._id,
    });
  } catch (err) {
    // Upload succeeded but we couldn't save metadata → critical failure
    console.error("[upload/route] Failed to create knowledge doc:", err);
    return errorResponse(
      "File uploaded to cloud storage but failed to save metadata. Contact support.",
      500,
      { cloudinaryUrl: cloudinaryResult.secure_url }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // From this point on, any failure triggers a PARTIAL SUCCESS (207) response.
  // The file is on Cloudinary; we must not discard it silently.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Helper: mark the document as FAILED and return a 207 partial-success response.
   * The HTTP 207 tells the client: "Upload OK, but processing failed."
   */
  async function partialFailure(reason) {
    try {
      await updateKnowledgeStatus(
        knowledgeDoc._id,
        PROCESSING_STATUS.FAILED,
        { processingError: reason }
      );
    } catch (dbErr) {
      console.error("[upload/route] Could not update FAILED status:", dbErr);
    }

    return NextResponse.json(
      {
        success: false,
        partialSuccess: true,
        error: reason,
        message:
          "Your file was uploaded successfully but text processing failed. " +
          "The document has been saved and can be reprocessed.",
        document: {
          id: knowledgeDoc._id.toString(),
          title: knowledgeDoc.title,
          originalFileName,
          cloudinaryUrl: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id,
          mimeType,
          size: cloudinaryResult.bytes,
          processingStatus: PROCESSING_STATUS.FAILED,
        },
      },
      { status: 207 }
    );
  }

  // Mark as PROCESSING now that we are starting the pipeline
  try {
    await updateKnowledgeStatus(knowledgeDoc._id, PROCESSING_STATUS.PROCESSING);
  } catch (err) {
    console.warn("[upload/route] Could not update status to PROCESSING:", err);
    // Non-fatal — continue
  }

  // ── Step 7: Extract plain text ─────────────────────────────────────────────
  let plainText;
  try {
    plainText = await extractText(buffer, mimeType);
  } catch (err) {
    const reason =
      err instanceof ParserServiceError
        ? `Text extraction failed: ${err.message}`
        : "An unexpected error occurred while parsing the document.";
    console.error("[upload/route] Parser error:", err);
    return partialFailure(reason);
  }

  // ── Step 8: Chunk the text ─────────────────────────────────────────────────
  let chunks;
  try {
    chunks = chunkText(plainText);
  } catch (err) {
    const reason =
      err instanceof ChunkServiceError
        ? `Text chunking failed: ${err.message}`
        : "An unexpected error occurred while chunking the document.";
    console.error("[upload/route] Chunk error:", err);
    return partialFailure(reason);
  }

  // ── Step 9: Generate embeddings ────────────────────────────────────────────
  let embeddingResult;
  try {
    embeddingResult = await generateEmbeddings(chunks);
  } catch (err) {
    const reason =
      err instanceof EmbeddingServiceError
        ? `Embedding generation failed: ${err.message}`
        : "An unexpected error occurred while generating embeddings.";
    console.error("[upload/route] Embedding error:", err);
    return partialFailure(reason);
  }

  // ── Step 10: Store embeddings in vector collection ─────────────────────────
  const vectorDocs = chunks.map((chunk, index) => ({
    userId: user._id,
    knowledgeId: knowledgeDoc._id,
    chunkIndex: index,
    content: chunk,
    vector: embeddingResult.embeddings[index],
    createdAt: new Date(),
  }));

  try {
    await storeEmbeddings(vectorDocs);
  } catch (err) {
    const reason =
      err instanceof DbServiceError
        ? `Vector storage failed: ${err.message}`
        : "An unexpected error occurred while storing embeddings.";
    console.error("[upload/route] Vector store error:", err);
    return partialFailure(reason);
  }

  // ── Step 11: Update document → READY ──────────────────────────────────────
  try {
    await updateKnowledgeStatus(knowledgeDoc._id, PROCESSING_STATUS.READY, {
      totalChunks: chunks.length,
      totalEmbeddingTokens: embeddingResult.totalTokens,
      processingCompletedAt: new Date(),
    });
  } catch (err) {
    // Embeddings are stored; this update failing is annoying but not catastrophic
    console.warn("[upload/route] Failed to update READY status:", err);
  }

  // ── Step 12: Return success response ──────────────────────────────────────
  return NextResponse.json(
    {
      success: true,
      message: "File uploaded and processed successfully.",
      document: {
        id: knowledgeDoc._id.toString(),
        title: title.toString().trim(),
        originalFileName,
        cloudinaryUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        mimeType,
        size: cloudinaryResult.bytes,
        totalChunks: chunks.length,
        totalEmbeddingTokens: embeddingResult.totalTokens,
        processingStatus: PROCESSING_STATUS.READY,
        uploadedBy: user._id.toString(),
        uploadedAt: knowledgeDoc.createdAt,
      },
    },
    { status: 201 }
  );
}