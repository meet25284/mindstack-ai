import { db } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function runVectorSearch(userQuery, userId) {
    try {
        if (!userQuery) return [];

        const collection = db.collection("vector");

        // Extract single vector array if userQuery is wrapped in a batch array
        const queryVector = Array.isArray(userQuery) && Array.isArray(userQuery[0])
            ? userQuery[0]
            : userQuery;

        const formattedUserId = typeof userId === "string" && ObjectId.isValid(userId)
            ? new ObjectId(userId)
            : userId;

        // The $vectorSearch stage MUST be the first stage in the aggregation pipeline
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",        // The name of the index created in Atlas
                    path: "vector",                 // The document field holding the vectors
                    queryVector: queryVector,       // The vector representation of your search term
                    numCandidates: 100,           // Number of cluster neighbors to inspect
                    limit: 5,                     // Total number of documents to return
                    filter: {
                        userId: formattedUserId
                    }
                }
            },
            {
                // Optional: Project only relevant fields and include the vector match score
                $project: {
                    _id: 1,
                    knowledgeId: 1,
                    content: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            },
            {
                $match: {
                    score: { $gte: 0.70 },
                },
            },
        ];

        const results = await collection.aggregate(pipeline).toArray();

        return Array.isArray(results) ? results : [];
    } catch (error) {
        console.error("Error executing vector search:", error);
        return [];
    }
}


