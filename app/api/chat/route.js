// app/api/chat/route.js

import Thread from "@/models/thread";

import { openai } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import Conversation from "@/models/conversation";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/middleware/auth";
import { generateBatchEmbeddings } from "@/services/generateEmbedding";
import runVectorSearch from "@/services/vectorSearch";

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

            const userPrompt = await generateBatchEmbeddings(prompt)

            const vectorResult = await runVectorSearch(userPrompt)
            console.log("🚀 ~ POST ~ vectorResult:",vectorResult)



            const result = streamText({
                model,
                system:
                    "You are a helpful library assistant for a library management system. Answer user queries helpfully and concisely.",
                messages: formattedHistory,
            });

            let fullResponse = "";

            const encoder = new TextEncoder();

            const stream = new ReadableStream({
                async start(controller) {
                    try {
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

                        // Save AI message

                        await Conversation.create({
                            ThreadId: threadId,
                            userId: user._id,
                            sender: "ai",
                            message: fullResponse,
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