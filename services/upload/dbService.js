/**
 * dbService.js
 *
 * WHY THIS FILE EXISTS:
 *   Concentrating all database interactions for the upload pipeline in one place
 *   means the route handler never constructs raw queries.  If the schema changes
 *   (e.g. renaming a field, adding an index), only this file needs updating.
 *
 *   Two databases are involved:
 *     1. Mongoose (MONGODB_URI)   — stores the File document (metadata / status)
 *     2. Raw MongoClient (VECTOR_DB) — stores the vector embeddings collection
 *        (the "vector" collection needs a MongoDB Atlas Vector Search index)
 *
 * EXPORTS:
 *   createKnowledgeDoc(data)                → creates a File doc with PENDING status
 *   updateKnowledgeStatus(id, status, extra) → updates status + optional extra fields
 *   storeEmbeddings(docs)                   → bulk-inserts into vector collection
 */

import connectDB from "@/services/mongoConnect";
import File, { PROCESSING_STATUS } from "@/models/files";
import { db } from "@/lib/mongodb";

// ─── Custom error class ────────────────────────────────────────────────────────

export class DbServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "DbServiceError";
    this.cause = cause ?? null;
  }
}

// ─── Knowledge document operations ───────────────────────────────────────────

/**
 * Create the initial File (knowledge) document after a successful Cloudinary upload.
 * Status starts as PENDING so the dashboard can show "in progress" immediately.
 *
 * @param {object} data
 * @param {string} data.title
 * @param {string} data.originalFileName
 * @param {string} data.cloudinaryUrl
 * @param {string} data.publicId
 * @param {string} data.mimeType
 * @param {number} data.size               File size in bytes
 * @param {string|import('mongoose').Types.ObjectId} data.uploadedBy  User's _id
 * @returns {Promise<import('mongoose').Document>}  The created File document
 * @throws {DbServiceError}
 */
export async function createKnowledgeDoc(data) {
  try {
    await connectDB();

    const doc = await File.create({
      title: data.title,
      originalFileName: data.originalFileName,
      cloudinaryUrl: data.cloudinaryUrl,
      publicId: data.publicId,
      mimeType: data.mimeType,
      size: data.size,
      userId: data.uploadedBy,
      processingStatus: PROCESSING_STATUS.PENDING,
    });

    return doc;
  } catch (err) {
    throw new DbServiceError(
      `Failed to create knowledge document: ${err.message}`,
      err
    );
  }
}

/**
 * Update the processing status of a File document.
 * Used to transition: PENDING → PROCESSING → READY | FAILED
 *
 * @param {string|import('mongoose').Types.ObjectId} id   Document _id
 * @param {keyof typeof PROCESSING_STATUS} status         Target status
 * @param {object} [extra={}]  Any additional fields to merge (e.g. totalChunks)
 * @returns {Promise<void>}
 * @throws {DbServiceError}
 */
export async function updateKnowledgeStatus(id, status, extra = {}) {
  if (!Object.values(PROCESSING_STATUS).includes(status)) {
    throw new DbServiceError(
      `Invalid processing status "${status}". ` +
        `Valid values: ${Object.values(PROCESSING_STATUS).join(", ")}`
    );
  }

  try {
    await connectDB();

    await File.findByIdAndUpdate(
      id,
      {
        $set: {
          processingStatus: status,
          updatedAt: new Date(),
          ...extra,
        },
      },
      { new: false }
    );
  } catch (err) {
    throw new DbServiceError(
      `Failed to update knowledge status to "${status}" for id "${id}": ${err.message}`,
      err
    );
  }
}

// ─── Vector embedding operations ─────────────────────────────────────────────

/**
 * Bulk-insert embedding documents into the "vector" collection.
 *
 * Each document in the array should have the shape:
 * {
 *   userId:      ObjectId | string,
 *   knowledgeId: ObjectId | string,
 *   chunkIndex:  number,
 *   content:     string,
 *   vector:      number[],   // 1536-dim float array
 *   createdAt:   Date
 * }
 *
 * @param {object[]} docs  Array of vector documents to insert
 * @returns {Promise<{ insertedCount: number }>}
 * @throws {DbServiceError}
 */
export async function storeEmbeddings(docs) {
  if (!Array.isArray(docs) || docs.length === 0) {
    throw new DbServiceError("storeEmbeddings received an empty or invalid docs array.");
  }

  try {
    const result = await db.collection("vector").insertMany(docs, {
      ordered: false, // continue on individual doc errors (rare with insertMany)
    });

    return { insertedCount: result.insertedCount };
  } catch (err) {
    throw new DbServiceError(
      `Failed to store ${docs.length} embedding documents: ${err.message}`,
      err
    );
  }
}
