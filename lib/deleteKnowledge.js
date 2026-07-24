import fs from "fs/promises";
import path from "path";
import { ObjectId } from "mongodb";
import File from "@/models/files";
import connectDB from "@/services/mongoConnect";
import { db } from "@/lib/mongodb";

/**
 * Delete a knowledge document completely:
 * 1. Remove physical file from assets/uploads
 * 2. Delete document metadata from MongoDB File collection
 * 3. Delete all vector chunks associated with the document
 *
 * @param {string} id - Document ID
 * @returns {Promise<{ success: boolean, deletedChunks: number, message: string }>}
 */
export async function deleteKnowledge(id) {
  if (!id) {
    throw new Error("Document ID is required.");
  }

  await connectDB();

  // Find file document
  const fileDoc = await File.findById(id);
  if (!fileDoc) {
    throw new Error("Document not found.");
  }

  // 1. Delete physical file from assets/uploads if exists
  if (fileDoc.path) {
    try {
      let absolutePath = fileDoc.path;
      if (!path.isAbsolute(absolutePath)) {
        absolutePath = path.join(process.cwd(), fileDoc.path);
      }
      
      await fs.access(absolutePath);
      await fs.unlink(absolutePath);
    } catch (err) {
      console.warn(`Physical file deletion warning for ${fileDoc.path}:`, err.message);
    }
  }

  // 2. Delete metadata document from MongoDB
  await File.findByIdAndDelete(id);

  // 3. Delete every chunk belonging to that document from vector collection
  let objId = null;
  try {
    objId = new ObjectId(id);
  } catch (e) {
    // Not valid ObjectId, string compare will be used
  }

  const matchConditions = [
    { knowledgeId: id },
    { documentId: id },
  ];

  if (objId) {
    matchConditions.push({ knowledgeId: objId });
    matchConditions.push({ documentId: objId });
  }

  const deleteResult = await db.collection("vector").deleteMany({
    $or: matchConditions,
  });

  return {
    success: true,
    deletedChunks: deleteResult?.deletedCount || 0,
    message: "Knowledge removed successfully.",
  };
}
