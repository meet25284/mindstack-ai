export default function rerank(vectorResults, bm25Results) {

    const k = 60;

    const map = new Map();

    vectorResults.forEach((doc, index) => {

        const id = doc._id.toString();

        if (!map.has(id)) {

            map.set(id, {
                ...doc,
                score: 0
            });

        }

        map.get(id).score += 1 / (k + index + 1);

    });

    bm25Results.forEach((doc, index) => {

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