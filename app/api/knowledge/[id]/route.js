/**
 * app/api/knowledge/[id]/route.js
 *
 * GET  /api/knowledge/:id  — Fetch document metadata + extracted text content
 * DELETE /api/knowledge/:id — Soft-delete a document and its embeddings
 *
 * The GET handler is called by FileViewerModal to load the "Extracted Content"
 * tab text and to determine whether to show the PDF preview tab (via fileType).
 * It must return correct metadata for both Cloudinary and legacy local-disk docs.
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ObjectId } from "mongodb";
import File from "@/models/files";
import connectDB from "@/services/mongoConnect";
import { db } from "@/lib/mongodb";
import { isAuthenticated } from "@/middleware/auth";
import { deleteKnowledge } from "@/lib/deleteKnowledge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive a normalised file extension label ("pdf", "docx", "txt", "md")
 * from either a MIME type string or a file path extension.
 *
 * This value drives `doc.fileType` on the frontend — the FileViewerModal uses
 * `doc.fileType === "pdf"` to decide whether to show the PDF preview tab.
 *
 * @param {string} mimeType   e.g. "application/pdf"
 * @param {string} filePath   e.g. "/uploads/1234-notes.pdf"
 * @returns {string}          e.g. "pdf"
 */
function resolveFileType(mimeType, filePath) {
  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf";
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      return "docx";
    if (mimeType === "text/plain") return "txt";
    if (mimeType === "text/markdown") return "md";
    // Generic fallback: use the subtype portion
    return mimeType.split("/").pop().toLowerCase();
  }
  // Legacy path-based fallback
  return path.extname(filePath || "").replace(".", "").toLowerCase() || "txt";
}

/**
 * Derive the display filename.
 *
 * @param {object} doc  Mongoose File document
 * @returns {string}
 */
function resolveFileName(doc) {
  if (doc.originalFileName) return doc.originalFileName;
  if (doc.path) return path.basename(doc.path);
  return doc.title || "file";
}

// ─── DELETE handler ───────────────────────────────────────────────────────────

export async function DELETE(request, { params }) {
  try {
    const user = await isAuthenticated(request);
    if (!user || user.status === 401 || user.status === 404) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: "Missing document ID" }, { status: 400 });
    }

    const result = await deleteKnowledge(id);

    return NextResponse.json({
      success: true,
      deletedChunks: result.deletedChunks,
      message: result.message || "Knowledge removed successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/knowledge/[id] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete knowledge document" },
      { status: 500 }
    );
  }
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
  // ── Authentication ───────────────────────────────────────────────────────────
  let user;
  try {
    user = await isAuthenticated(request);
  } catch (_) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!user || user.status === 401 || user.status === 404) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Missing document ID" }, { status: 400 });
    }

    await connectDB();
    const doc = await File.findById(id);
    if (!doc) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    // ── Resolve display metadata ─────────────────────────────────────────────
    const fileName = resolveFileName(doc);

    // fileType MUST correctly reflect the actual file format.
    // FileViewerModal checks: doc.fileType === "pdf" to show the PDF preview tab.
    const fileType = resolveFileType(doc.mimeType, doc.path);

    // ── Extract text content ─────────────────────────────────────────────────
    let content = "";
    let readFromFile = false;

    // For legacy local-disk TXT/MD/DOCX documents: read directly from filesystem
    if (doc.path && !doc.cloudinaryUrl) {
      const ext = path.extname(doc.path).replace(".", "").toLowerCase();
      try {
        let absolutePath = doc.path;
        if (!path.isAbsolute(absolutePath)) {
          absolutePath = path.join(process.cwd(), absolutePath);
        }

        if (ext === "txt" || ext === "md") {
          content = await fs.readFile(absolutePath, "utf-8");
          readFromFile = true;
        } else if (ext === "docx") {
          const mammoth = await import("mammoth");
          const buffer = await fs.readFile(absolutePath);
          const result = await mammoth.extractRawText({ buffer });
          content = result.value;
          readFromFile = true;
        }
        // PDF: always fall through to vector-chunk aggregation below
      } catch (err) {
        console.warn(`[knowledge/[id]] Could not read local file ${doc.path}:`, err.message);
      }
    }

    // For PDFs (both Cloudinary and legacy) and any file we couldn't read
    // from disk: reconstruct text from stored vector chunks.
    // This works because we always extract and store the full text as chunks
    // during the upload pipeline — the chunks ARE the text.
    if (!readFromFile) {
      let objId = null;
      try {
        objId = new ObjectId(id);
      } catch (_) { /* invalid ObjectId — skip */ }

      const matchConditions = [
        { knowledgeId: id },
        { documentId: id },
      ];
      if (objId) {
        matchConditions.push({ knowledgeId: objId });
        matchConditions.push({ documentId: objId });
      }

      const chunks = await db
        .collection("vector")
        .find({ $or: matchConditions })
        .sort({ chunkIndex: 1 })
        .toArray();

      content = chunks.map((c) => c.content || "").join("\n\n---\n\n");
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc._id.toString(),
        title: doc.title,
        originalFileName: doc.originalFileName || fileName,
        fileName,
        // fileType is the critical field: "pdf", "docx", "txt", or "md"
        fileType,
        mimeType: doc.mimeType || null,
        cloudinaryUrl: doc.cloudinaryUrl || null,
        publicId: doc.publicId || null,
        // Legacy field — kept for backward compat
        filePath: doc.path || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        processingStatus: doc.processingStatus || "READY",
      },
      content,
    });
  } catch (error) {
    console.error("GET /api/knowledge/[id] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve document details" },
      { status: 500 }
    );
  }
}
