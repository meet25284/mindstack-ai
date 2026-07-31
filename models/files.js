import mongoose from "mongoose";

/**
 * Processing status lifecycle for an uploaded document.
 *
 * PENDING     → document record created, Cloudinary upload in progress
 * PROCESSING  → text extracted, embedding generation in progress
 * READY       → embeddings stored, document is searchable
 * FAILED      → a non-recoverable error occurred during processing
 */
const PROCESSING_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  READY: "READY",
  FAILED: "FAILED",
};

const FileSchema = new mongoose.Schema({
  // ─── Core identity ──────────────────────────────────────────────────────────
  title: {
    type: String,
    required: true,
    trim: true,
  },

  /** Original filename as uploaded by the user (e.g. "project-notes.pdf") */
  originalFileName: {
    type: String,
    default: "",
  },

  // ─── Cloudinary fields ───────────────────────────────────────────────────────
  /** Full HTTPS URL to the file on Cloudinary */
  cloudinaryUrl: {
    type: String,
    default: "",
  },

  /** Cloudinary public_id used to delete or transform the asset */
  publicId: {
    type: String,
    default: "",
  },

  // ─── File metadata ───────────────────────────────────────────────────────────
  /** MIME type (e.g. "application/pdf", "text/plain") */
  mimeType: {
    type: String,
    default: "",
  },

  /** File size in bytes */
  size: {
    type: Number,
    default: 0,
  },

  // ─── Legacy local-disk path (kept for backward compat) ──────────────────────
  /** Absolute path on disk — populated only for documents uploaded before Cloudinary */
  path: {
    type: String,
    default: "",
  },

  // ─── Ownership ───────────────────────────────────────────────────────────────
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // ─── Processing pipeline state ───────────────────────────────────────────────
  processingStatus: {
    type: String,
    enum: Object.values(PROCESSING_STATUS),
    default: PROCESSING_STATUS.PENDING,
    index: true,
  },

  /** How many text chunks were generated from this document */
  totalChunks: {
    type: Number,
    default: 0,
  },

  /** Total OpenAI embedding tokens consumed when indexing this document */
  totalEmbeddingTokens: {
    type: Number,
    default: 0,
  },

  /** Timestamp when embedding generation completed successfully */
  processingCompletedAt: {
    type: Date,
    default: null,
  },

  /** Human-readable error message when processingStatus === "FAILED" */
  processingError: {
    type: String,
    default: null,
  },

  // ─── Soft-delete ─────────────────────────────────────────────────────────────
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },

},
// Mongoose manages createdAt & updatedAt automatically with this option.
// Do NOT add a manual pre-save hook — it conflicts with File.create() in Mongoose v9.
{ timestamps: true });

/** Export the status enum so services can reference it without magic strings */
export { PROCESSING_STATUS };

const File = mongoose.models.File || mongoose.model("File", FileSchema);
export default File;
