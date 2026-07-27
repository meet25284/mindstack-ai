import bm25Search from "./bm25Search";
import rerank from "./rerank";
import runVectorSearch from "./vectorSearch";


export async function hybridSearch(prompt, userEmbedding) {

    const [vectorResult, bm25Result] = await Promise.all([

        runVectorSearch(userEmbedding),

        bm25Search(prompt)

    ]);

    return rerank(vectorResult, bm25Result);

}