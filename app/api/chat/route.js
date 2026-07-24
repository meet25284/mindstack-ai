// app/api/chat/route.js

import Thread from "@/models/thread";

import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, streamText, tool } from "ai";
import Conversation from "@/models/conversation";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/middleware/auth";
import { generateBatchEmbeddings } from "@/services/generateEmbedding";
import runVectorSearch from "@/services/vectorSearch";
import buildSystemPrompt from "@/services/promptBuilder";


const model = openai("gpt-4o-mini");

// ---------------- Generate Title ----------------

const generateTitle = async (message) => {
    if (process.env.NODE_ENV === "test") {
        return "Mocked Title";
    }

    try {
        const { text } = await generateText({
            model,
            system:
                "Generate a very short chat title (maximum 4 words, no quotes, no markdown).",
            prompt: message,
        });

        return text.trim() || "New Chat";
    } catch (err) {
        console.error(err);

        return message.split(" ").slice(0, 5).join(" ") || "New Chat";
    }
};

// ---------------- POST ----------------

export async function POST(req) {

    try {
        const user = await isAuthenticated(req)
        if (user.status !== (401 || 404)) {
            const { prompt, threadId: incomingThreadId } = await req.json();

            let threadId = incomingThreadId;

            // ---------------- Thread ----------------

            if (!threadId || threadId === "new" || threadId === "new chat") {
                const title = await generateTitle(prompt);

                const thread = await Thread.create({
                    userId: user._id,
                    title,
                });

                threadId = thread._id.toString();
            } else {
                const thread = await Thread.findOne({
                    _id: threadId,
                    userId: user._id,
                });

                if (!thread) {
                    return Response.json(
                        { message: "Thread not found" },
                        { status: 404 }
                    );
                }
            }

            // ---------------- Conversation ----------------

            const messageHistory = await Conversation.find({
                ThreadId: threadId,
            }).sort({ createdAt: 1 });

            const formattedHistory = messageHistory
                .filter((msg) => msg.message?.trim())
                .map((msg) => ({
                    role: msg.sender === "ai" ? "assistant" : "user",
                    content: msg.message,
                }));

            // Add current prompt    
            formattedHistory.push({
                role: "user",
                content: prompt,
            });

            const tools = {
                searchKnowledgeBase: tool({
                    description: `

Use this tool in this case:

RETRY / TRY AGAIN: When the user says things like "try again", "regenerate", "redo that", "retry", "give me another answer", or otherwise expresses dissatisfaction WITHOUT asking a new question — do NOT search using their literal words ("try again" etc has no meaning for search). Instead:
   - Look back in the conversation history and find the user's last real question (the one before "try again").
   - Re-embed that ORIGINAL question and run vector search on it again.
   - Optionally rephrase/expand the original question slightly to retrieve a different or broader set of chunks than last time.
   - Use the newly retrieved context to generate a fresh answer, even if the context is similar to before — do not just repeat the previous answer verbatim.

Never pass meta-phrases like "try again", "retry", or "regenerate" directly as the search query — always resolve them to the real underlying question first.`,

                    execute: async () => {
                        // Generate embedding for user's last question
                        const userEmbedding = await generateBatchEmbeddings(formattedHistory[formattedHistory.length - 3].content);

                        // Search similar chunks from MongoDB Vector Search
                        const vectorResult = await runVectorSearch(userEmbedding);
                        const context = vectorResult
                            .map(chunk => chunk.content)
                            .join("\n\n");
                        return `You are MindStack AI, a knowledge assistant. You answer ONLY using the 
CONTEXT provided below. You have NO other knowledge. Pretend you know nothing about 
the world except what is written in the Context section.

STRICT RULE (most important — never break this):
- Every fact, definition, number, name, or example in your answer MUST come word-for-word 
  traceable to the Context below.
- If a detail is not explicitly present in the Context, you must NOT include it — even if 
  you "know" it's true, even if it's common knowledge, even if it seems obviously correct.
- Do not add extra explanation, examples, or definitions that are not in the Context, 
  even to be "helpful."
- Before answering, silently check: "Is every sentence I'm about to write backed by the 
  Context?" If any part is not, remove that part or fall back to the not-found message.

GREETINGS & SMALL TALK (exception — no context needed):
- ONLY for pure greetings/small talk with no question (hi, hello, thanks, bye) — reply 
  briefly and invite a question. This exception applies ONLY when there is no actual 
  question in the message. If there's any question mixed in, treat it as a real question 
  and apply the STRICT RULE above.

SYNTHESIS RULE (limited):
- You may combine multiple pieces from the Context to form one answer (e.g. joining 
  scattered bullet points into a definition).
- This is NOT permission to add outside facts, infer beyond what's written, or "complete" 
  a partial definition using general knowledge. If the Context only has fragments and no 
  clear full answer, say so or use the not-found message.

CITATIONS:
- Cite document name and page number in brackets when available. If not available in 
  Context, cite the section heading. Never invent a citation.

If the answer is not in the Context, respond exactly with:
"I couldn't find this information in the knowledge base."

Context:
${context}
`;
                    }
                })
            }
            // Generate embedding for user's question
            const userEmbedding = await generateBatchEmbeddings(prompt);

            // Search similar chunks from MongoDB Vector Search
            const vectorResult = await runVectorSearch(userEmbedding);

            const cleanSources = Array.isArray(vectorResult)
                ? vectorResult.map((v) => ({
                    knowledgeId: v.knowledgeId ? v.knowledgeId.toString() : "",
                    content: v.content || "",
                    score: v.score || 0,
                }))
                : [];

            const context = vectorResult
                .map(chunk => chunk.content)
                .join("\n\n");

            const result = streamText({
                model,
                system: buildSystemPrompt(context),
                tools,
                messages: formattedHistory,
                stopWhen: stepCountIs(5),
            });

            let fullResponse = "";

            const encoder = new TextEncoder();

            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        // Enqueue sources metadata upfront
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify({
                                    sources: cleanSources,
                                    threadId,
                                })}\n\n`
                            )
                        );

                        for await (const chunk of result.textStream) {
                            fullResponse += chunk;

                            controller.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({
                                        text: chunk,
                                    })}\n\n`
                                )
                            );
                        }

                        // Save user message
                        await Conversation.create({
                            ThreadId: threadId,
                            userId: user._id,
                            sender: "user",
                            message: prompt,
                        });

                        // Save AI message with sources
                        await Conversation.create({
                            ThreadId: threadId,
                            userId: user._id,
                            sender: "ai",
                            message: fullResponse,
                            sources: cleanSources,
                        });

                        await Thread.findByIdAndUpdate(threadId, {
                            updatedAt: new Date(),
                        });

                        const threadInfo = await Thread.findById(threadId);

                        controller.enqueue(
                            encoder.encode(
                                `event: end\n` +
                                `data: ${JSON.stringify({
                                    threadId,
                                    title: threadInfo?.title || "New Chat",
                                    sources: cleanSources,
                                })}\n\n`
                            )
                        );

                        controller.close();
                    } catch (err) {
                        controller.enqueue(
                            encoder.encode(
                                `event: error\n` +
                                `data: ${JSON.stringify({
                                    message: err.message,
                                })}\n\n`
                            )
                        );

                        controller.close();
                    }
                },
            });
            return new Response(stream, {
                headers: {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                },
            }
            )
        }
        else {
            return NextResponse.json({
                message: "Unauthorized"
            }, { status: 401 })
        }
    } catch (err) {
        console.error(err);

        return Response.json(
            {
                message: err.message,
            },
            {
                status: 500,
            }
        );
    }
}