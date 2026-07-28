export default function rerank(vectorResults, bm25Results) {
    const safeVectorResults = Array.isArray(vectorResults) ? vectorResults : [];
    const safeBm25Results = Array.isArray(bm25Results) ? bm25Results : [];

    const k = 60;
    const map = new Map();

    safeVectorResults.forEach((doc, index) => {
        if (!doc || !doc._id) return;
        const id = doc._id.toString();

        if (!map.has(id)) {
            map.set(id, {
                ...doc,
                score: 0
            });
        }

        map.get(id).score += 1 / (k + index + 1);
    });

    safeBm25Results.forEach((doc, index) => {
        if (!doc || !doc._id) return;
        const id = doc._id.toString();

        if (!map.has(id)) {
            map.set(id, {
                ...doc,
                score: 0
            });
        }

        map.get(id).score += 1 / (k + index + 1);
    });

    return [...map.values()]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
}