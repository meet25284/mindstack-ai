/**
 * services/chat.js
 *
 * SSE consumer for POST /api/chat.
 *
 * Callbacks:
 *   onChunk(text)            — called for each streamed token chunk
 *   onSources(sources[])     — called once with RAG citation metadata
 *   onDone(payload)          — called on "event: end" with final metadata
 *                              payload includes: threadId, title, sources,
 *                              aiResponseId, totalUsage, usage,
 *                              remainingTokens, lowBalanceWarning
 *   onError(err)             — called on stream error or network failure
 *   onInsufficientTokens()   — called on HTTP 402 (out of tokens)
 */
export const chat = async (
    promptData,
    { onChunk, onSources, onDone, onError, onInsufficientTokens }
) => {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(promptData),
        });

        // ── 402 — Insufficient tokens ────────────────────────────────────────
        if (res.status === 402) {
            let errData = {};
            try { errData = await res.json(); } catch { /* empty body */ }
            onInsufficientTokens?.(errData);
            return;
        }

        // ── Other non-OK statuses ────────────────────────────────────────────
        if (!res.ok || !res.body) {
            let errMsg = `Request failed: ${res.status}`;
            try {
                const errData = await res.json();
                errMsg = errData.message || errMsg;
            } catch { /* ignore */ }
            throw new Error(errMsg);
        }

        // ── SSE stream reading ───────────────────────────────────────────────
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split("\n\n");
            buffer = events.pop(); // keep incomplete trailing event

            for (const rawEvent of events) {
                if (!rawEvent.trim()) continue;

                const lines = rawEvent.split("\n");
                let eventType = "message";
                let dataLine = "";

                for (const line of lines) {
                    if (line.startsWith("event:")) {
                        eventType = line.replace("event:", "").trim();
                    } else if (line.startsWith("data:")) {
                        dataLine = line.replace("data:", "").trim();
                    }
                }

                if (!dataLine) continue;

                let parsed;
                try {
                    parsed = JSON.parse(dataLine);
                } catch {
                    continue;
                }

                if (parsed.sources) {
                    onSources?.(parsed.sources);
                }

                if (eventType === "end") {
                    // parsed now includes: threadId, title, sources, aiResponseId,
                    // totalUsage, usage, remainingTokens, lowBalanceWarning
                    onDone?.(parsed);
                } else if (eventType === "error") {
                    onError?.(new Error(parsed.message || "Stream error"));
                } else if (parsed.text !== undefined) {
                    onChunk?.(parsed.text);
                }
            }
        }
    } catch (err) {
        console.error("Error in chat request:", err);
        onError?.(err);
    }
};