// app/api/chat/route.js

import Thread from "@/models/thread";

import { tool } from "ai";
import Conversation from "@/models/conversation";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/middleware/auth";
import { generateBatchEmbeddings, generateResponse, generateTitle, updateUsage } from "@/services/model";
import buildSystemPrompt from "@/services/rag/promptBuilder";
import { hybridSearch } from "@/services/rag/hybridSearch";
import { z } from "zod";


// ---------------- POST ----------------

export async function POST(req) {

    try {
        const user = await isAuthenticated(req)
        if (user.status !== (401 || 404)) {
            const { prompt, threadId: incomingThreadId } = await req.json();

            if (user.isPremium == false) {
                return NextResponse.json(
                    { message: "you have reached your credit limits buy new credits" },
                    { status: 400 }
                );

            }

            let threadId = incomingThreadId;

            // ---------------- Thread ----------------

            if (!threadId || threadId === "new" || threadId === "new chat") {
                // ---------------- Generate Title ----------------
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
                searchKnowledge: tool({
                    description: 'Search the knowledge base for relevant information to answer the user question. Call this whenever the user asks a factual, procedural, or knowledge-based question, or asks you to retry/search again.',
                    inputSchema: z.object({
                        query: z
                            .string()
                            .describe(
                                'A focused, self-contained search query capturing the core information need of the user\'s question. Rephrase or expand ambiguous references (e.g. resolve "it"/"that" using conversation context) into a clear standalone query optimized for retrieval.'
                            ),
                    }),
                    execute: async ({ query }) => {
                        // Generate embedding for the AI-generated query
                        const userEmbedding = await generateBatchEmbeddings(query);

                        // Search similar chunks from MongoDB hybrid search
                        const hybridResult = await hybridSearch(query, userEmbedding, user._id);

                        const context = hybridResult
                            .map(chunk => chunk.content)
                            .join("\n\n");

                        return context;
                    }
                })
            }
            // Generate embedding for user's question
            const userEmbedding = await generateBatchEmbeddings(prompt);

            // Search similar chunks from MongoDB hybrid Search
            const hybridResult = await hybridSearch(prompt, userEmbedding, user._id);

            const cleanSources = Array.isArray(hybridResult)
                ? hybridResult.map((v) => ({
                    knowledgeId: v.knowledgeId ? v.knowledgeId.toString() : "",
                    content: v.content || "",
                    score: v.score || 0,
                }))
                : [];


            const result = await generateResponse(buildSystemPrompt(), formattedHistory, tools)


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
                        const ai_response = await Conversation.create({
                            ThreadId: threadId,
                            userId: user._id,
                            sender: "ai",
                            message: fullResponse,
                            sources: cleanSources,
                        });

                        const usageDoc = await updateUsage(user._id, ai_response._id, threadId);

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
                                    aiResponseId: ai_response._id.toString(),
                                    totalUsage: usageDoc?.totalUsage || 0,
                                    usage: usageDoc,
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