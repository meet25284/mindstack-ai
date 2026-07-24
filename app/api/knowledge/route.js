import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { ObjectId } from "mongodb";
import File from "@/models/files";
import connectDB from "@/services/mongoConnect";
import { db } from "@/lib/mongodb";
import { isAuthenticated } from "@/middleware/auth";

export async function GET(request) {
  try {
    const user = await isAuthenticated(request);
    if (!user || user.status === 401 || user.status === 404) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Retrieve all active documents
    const files = await File.find({ userId: user._id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });

    const documents = await Promise.all(
      files.map(async (doc) => {
        const idStr = doc._id.toString();

        let objId = null;
        try {
          objId = new ObjectId(idStr);
        } catch (e) { }

        const matchConditions = [
          { knowledgeId: idStr },
          { documentId: idStr },
        ];
        if (objId) {
          matchConditions.push({ knowledgeId: objId });
          matchConditions.push({ documentId: objId });
        }

        // Count stored vector chunks
        const chunkCount = await db.collection("vector").countDocuments({
          $or: matchConditions,
        });

        // Determine filename, type, and size from stored path
        const storedPath = doc.path || "";
        const basename = storedPath ? path.basename(storedPath) : doc.title;
        const ext = path.extname(storedPath).replace(".", "").toLowerCase() || "txt";

        let fileSize = 0;
        if (storedPath) {
          try {
            let absolutePath = storedPath;
            if (!path.isAbsolute(absolutePath)) {
              absolutePath = path.join(process.cwd(), storedPath);
            }
            const stat = await fs.stat(absolutePath);
            fileSize = stat.size;
          } catch (statErr) {
            fileSize = 0;
          }
        }

        return {
          id: idStr,
          documentId: idStr,
          title: doc.title || basename,
          fileName: basename,
          filePath: storedPath,
          fileType: ext,
          fileSize: fileSize,
          uploadDate: doc.createdAt || doc.updatedAt || new Date().toISOString(),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          chunkCount: chunkCount,
          totalEmbeddings: chunkCount,
          status: "Ready",
        };
      })
    );

    return NextResponse.json({
      success: true,
      documents,
      totalCount: documents.length,
    });
  } catch (error) {
    console.error("GET /api/knowledge Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch knowledge documents" },
      { status: 500 }
    );
  }
}
