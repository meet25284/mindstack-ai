import { db } from "@/lib/mongodb";

export default async function bm25Search(query) {

    return await db.collection("vector")
        .aggregate([
            {
                $search: {
                    index: "BM25",
                    text: {
                        query,
                        path: "content"
                    }
                }
            },
            {
                $project: {
                    content: 1,
                    knowledgeId: 1,
                    chunkIndex:1,
                    score: {
                        $meta: "searchScore"
                    }
                }
            },
            {
                $limit: 5
            }
        ])
        .toArray();

}