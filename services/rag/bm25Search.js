import { db } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function bm25Search(query, userId) {
    try {
        if (!query) return [];

        const formattedUserId = typeof userId === "string" && ObjectId.isValid(userId)
            ? new ObjectId(userId)
            : userId;

        const results = await db.collection("vector")
            .aggregate([
                {
                    $search: {
                        index: "BM25",
                        compound: {
                            must: [
                                {
                                    text: {
                                        query,
                                        path: "content"
                                    }
                                }
                            ],
                            filter: [
                                {
                                    equals: {
                                        path: "userId",
                                        value: formattedUserId
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    $project: {
                        content: 1,
                        knowledgeId: 1,
                        chunkIndex: 1,
                        score: { $meta: "searchScore" }
                    }
                },
                {
                    $limit: 5
                }
            ])
            .toArray();

        return Array.isArray(results) ? results : [];
    } catch (error) {
        console.error("Error executing BM25 search:", error);
        return [];
    }
}