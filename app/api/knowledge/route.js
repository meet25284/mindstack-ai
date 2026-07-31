/**
 * app/api/knowledge/route.js
 *
 * GET /api/knowledge
 *
 * Returns all non-deleted knowledge documents belonging to the authenticated user.
 * Updated to read from the new File schema fields (cloudinaryUrl, originalFileName,
 * mimeType, size, processingStatus) while gracefully falling back to the legacy
 * `path` field for documents uploaded before the Cloudinary migration.
 */

import { NextResponse } from "next/server";
import path from "path";
import { ObjectId } from "mongodb";
import File from "@/models/files";
import connectDB from "@/services/mongoConnect";
import { db } from "@/lib/mongodb";
import { isAuthenticated } from "@/middleware/auth";

export async function GET(request) {
  // ── Authentication ───────────────────────────────────────────────────────────
  let user;
  try {
    user = await isAuthenticated(request);
  } catch (err) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  // isAuthenticated can return a NextResponse object (not a User) on auth failure
  if (!user || typeof user.status === "number") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    // Retrieve all active documents for this user, newest first
    const files = await File.find(
      { userId: user._id, isDeleted: { $ne: true } },
      // Exclude heavy fields not needed for the list view
      { __v: 0 }
    ).sort({ createdAt: -1 });

    const documents = await Promise.all(
      files.map(async (doc) => {
        const idStr = doc._id.toString();

        // Build a query that handles both ObjectId and string variants of knowledgeId
        let objId = null;
        try {
          objId = new ObjectId(idStr);
        } catch (_) { /* invalid ObjectId format — skip */ }

        const matchConditions = [
          { knowledgeId: idStr },
          { documentId: idStr },
        ];
        if (objId) {
          matchConditions.push({ knowledgeId: objId });
          matchConditions.push({ documentId: objId });
        }

        // Count stored vector chunks for this document
        const chunkCount = await db.collection("vector").countDocuments({
          $or: matchConditions,
        });

        // ── Resolve display fields ───────────────────────────────────────────
        // New documents: use Cloudinary fields
        // Legacy documents: derive from local `path`

        const isCloudinaryDoc = Boolean(doc.cloudinaryUrl);

        // File name
        const fileName = isCloudinaryDoc
          ? (doc.originalFileName || doc.title)
          : (doc.path ? path.basename(doc.path) : doc.title);

        // File type / extension — must be "pdf", "docx", "txt", or "md" for
        // the frontend's isPdf / badge logic to work correctly.
        const mimeToExt = {
          "application/pdf": "pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
          "text/plain": "txt",
          "text/markdown": "md",
        };
        const fileType = isCloudinaryDoc
          ? (mimeToExt[doc.mimeType] || doc.mimeType?.split("/").pop()?.toLowerCase() || "unknown")
          : path.extname(doc.path || "").replace(".", "").toLowerCase() || "txt";

        // File size in bytes
        let fileSize = doc.size ?? 0;
        if (!isCloudinaryDoc && doc.path && fileSize === 0) {
          try {
            const fs = await import("fs/promises");
            const absolutePath = path.isAbsolute(doc.path)
              ? doc.path
              : path.join(process.cwd(), doc.path);
            const stat = await fs.stat(absolutePath);
            fileSize = stat.size;
          } catch (_) {
            fileSize = 0;
          }
        }

        // File URL for preview
        const fileUrl = isCloudinaryDoc ? doc.cloudinaryUrl : null;

        return {
          id: idStr,
          documentId: idStr,
          title: doc.title || fileName,
          originalFileName: doc.originalFileName || fileName,
          fileName,
          filePath: doc.path || null,
          cloudinaryUrl: doc.cloudinaryUrl || null,
          publicId: doc.publicId || null,
          fileUrl,
          fileType,
          mimeType: doc.mimeType || null,
          fileSize,
          processingStatus: doc.processingStatus || "READY",
          totalChunks: doc.totalChunks || chunkCount,
          totalEmbeddingTokens: doc.totalEmbeddingTokens || 0,
          chunkCount,
          totalEmbeddings: chunkCount,
          uploadDate: doc.createdAt || new Date().toISOString(),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          processingCompletedAt: doc.processingCompletedAt || null,
          processingError: doc.processingError || null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      documents,
      totalCount: documents.length,
    });
  } catch (error) {
    console.error("[GET /api/knowledge] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch knowledge documents" },
      { status: 500 }
    );
  }
}
