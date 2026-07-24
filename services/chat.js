export const chat = async (promptData, { onChunk, onSources, onDone, onError }) => {
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(promptData),
        });

        if (!res.ok || !res.body) {
            throw new Error(`Request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split("\n\n");
            buffer = events.pop();

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
                    onDone?.(parsed);
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