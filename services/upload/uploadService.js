/**
 * uploadService.js
 *
 * WHY THIS FILE EXISTS:
 *   Cloudinary's Node SDK does not expose a native "upload from Buffer" function
 *   in its v2 API.  Instead it provides upload_stream(), which expects a writable
 *   Node.js stream.  This service wraps that callback-based stream API inside a
 *   clean Promise so the caller can simply `await uploadToCloudinary(buffer, ...)`.
 *
 * RESPONSIBILITY:
 *   - Accept a Buffer, mimeType, and original filename.
 *   - Stream the buffer to Cloudinary under the "mindstack" folder.
 *   - Return { secure_url, public_id, bytes } on success.
 *   - Throw a descriptive UploadServiceError on failure.
 */

import { v4 as uuidv4 } from "uuid";
import cloudinary from "@/lib/cloudinary";
import { Readable } from "stream";

// ─── Custom error class ────────────────────────────────────────────────────────

export class UploadServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "UploadServiceError";
    this.cause = cause ?? null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a safe, human-readable slug from a filename.
 * Strips the extension and replaces whitespace / special chars with hyphens.
 *
 * @param {string} originalName  e.g. "My Document (v2).pdf"
 * @returns {string}             e.g. "My-Document--v2-"
 */
function slugifyFileName(originalName) {
  return originalName
    .replace(/\.[^.]+$/, "")       // strip extension
    .replace(/[^a-zA-Z0-9-_]/g, "-") // replace unsafe chars
    .slice(0, 60);                  // cap length
}

/**
 * Converts a Buffer to a Readable stream (required by upload_stream).
 *
 * @param {Buffer} buffer
 * @returns {Readable}
 */
function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null); // signals end-of-stream
  return readable;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Uploads a file buffer to Cloudinary.
 *
 * @param {Buffer} buffer           Raw file bytes
 * @param {string} mimeType         MIME type of the file (e.g. "application/pdf")
 * @param {string} originalFileName Original filename from the upload form
 * @returns {Promise<{secure_url: string, public_id: string, bytes: number}>}
 * @throws {UploadServiceError}
 */
export async function uploadToCloudinary(buffer, mimeType, originalFileName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new UploadServiceError("uploadToCloudinary received an empty or invalid buffer.");
  }

  const slug = slugifyFileName(originalFileName);
  const publicId = `mindstack/${slug}-${uuidv4()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        // IMPORTANT: resource_type "raw" ensures Cloudinary stores and serves
        // the original file bytes unchanged. With "auto", PDFs are classified
        // as "image" type and may be subject to delivery transformations that
        // require special account permissions to bypass.
        resource_type: "raw",

        // DO NOT set folder + public_id together — Cloudinary concatenates them,
        // producing a double-prefix like "mindstack/mindstack/...".
        // The public_id already contains "mindstack/" as a path prefix.
        public_id: publicId,

        use_filename: false, // we supply our own public_id
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          return reject(
            new UploadServiceError(
              `Cloudinary upload failed: ${error.message}`,
              error
            )
          );
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
        });
      }
    );

    // Pipe the buffer into the upload stream
    bufferToStream(buffer).pipe(uploadStream);
  });
}
