import { db } from "@/lib/mongodb";

export default async function runVectorSearch(userQuery) {
    try {

        const collection = db.collection("vector");

        // The $vectorSearch stage MUST be the first stage in the aggregation pipeline
        const pipeline = [
            {
                $vectorSearch: {
                    index: "vector_index",        // The name of the index you created in Atlas
                    path: "vector",       // The document field holding the vectors
                    queryVector: userQuery[0],     // The vector representation of your search term
                    numCandidates: 100,           // Number of cluster neighbors to inspect (higher = more accurate)
                    limit: 2                      // Total number of documents to return
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
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        return JSON.stringify(results, null, 2);
    } catch (error) {
        return `Error executing vector search: ${error.message}`
    }
}

