import bm25Search from "./bm25Search";
import rerank from "./rerank";
import runVectorSearch from "./vectorSearch";


export async function hybridSearch(prompt, userEmbedding, userId) {

    const [vectorResult, bm25Result] = await Promise.all([

        runVectorSearch(userEmbedding, userId),

        bm25Search(prompt, userId)

    ]);

    return rerank(vectorResult, bm25Result);

}