import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ObjectId } from "mongodb";
import File from "@/models/files";
import connectDB from "@/services/mongoConnect";
import { db } from "@/lib/mongodb";
import { isAuthenticated } from "@/middleware/auth";
import { deleteKnowledge } from "@/lib/deleteKnowledge";

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

export async function GET(request, { params }) {
  try {
    const user = await isAuthenticated(request);
    if (!user || user.status === 401 || user.status === 404) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Missing document ID" }, { status: 400 });
    }

    await connectDB();
    const doc = await File.findById(id);
    if (!doc) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    const storedPath = doc.path || "";
    const basename = storedPath ? path.basename(storedPath) : doc.title;
    const ext = path.extname(storedPath).replace(".", "").toLowerCase() || "txt";

    let content = "";
    let readFromFile = false;

    // Try reading directly from file system first
    if (storedPath) {
      try {
        let absolutePath = storedPath;
        if (!path.isAbsolute(absolutePath)) {
          absolutePath = path.join(process.cwd(), storedPath);
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
      } catch (err) {
        console.warn(`Could not read file from disk for ${storedPath}:`, err.message);
      }
    }

    // Fallback or PDF: aggregate text chunks from vector collection
    if (!readFromFile) {
      let objId = null;
      try {
        objId = new ObjectId(id);
      } catch (e) {}

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
        fileName: basename,
        filePath: storedPath,
        fileType: ext,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
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
