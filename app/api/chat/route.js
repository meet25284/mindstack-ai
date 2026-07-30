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
import User from "@/models/users";
import Transaction from "@/models/transaction";
import { chatRequestValidator } from "@/validations/validate";
import connectDB from "@/services/mongoConnect";

// ── Token billing constants ────────────────────────────────────────────────────
// Conversion: 1 paisa = 50 tokens  →  ₹1 = 5,000 tokens
// Low-balance threshold: ₹10 = 1,000 paise = 50,000 tokens
const LOW_BALANCE_THRESHOLD = 50_000; // tokens = ₹10 worth

// Minimum tokens reserved *before* streaming starts.
// We pre-deduct this amount, then reconcile after the stream finishes.
// Must cover the cheapest realistic response (embedding + title + short reply).
const MIN_TOKENS_PRE_DEDUCT = 500;

// ---------------- POST ----------------

export async function POST(req) {
    try {
        await connectDB();

        // ── Auth ─────────────────────────────────────────────────────────────
        const user = await isAuthenticated(req);
        if (user.status === 401 || user.status === 404) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // ── Input validation ─────────────────────────────────────────────────
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = chatRequestValidator.safeParse(body);
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || "Invalid request";
            return NextResponse.json({ message: firstError }, { status: 400 });
        }

        const { prompt, threadId: incomingThreadId } = parsed.data;

        // ── Atomic pre-deduction ─────────────────────────────────────────────
        // Use findOneAndUpdate with $gte guard so concurrent requests can never
        // push the balance below 0. Returns null if balance is insufficient.
        const preDeducted = await User.findOneAndUpdate(
            { _id: user._id, tokens: { $gte: MIN_TOKENS_PRE_DEDUCT } },
            { $inc: { tokens: -MIN_TOKENS_PRE_DEDUCT } },
            { new: true }
        );

        if (!preDeducted) {
            return NextResponse.json(
                {
                    message: "Insufficient tokens. Please recharge to continue chatting.",
                    code: "INSUFFICIENT_TOKENS",
                    remainingTokens: user.tokens ?? 0,
                },
                { status: 402 }
            );
        }

        // ── Thread ───────────────────────────────────────────────────────────
        let threadId = incomingThreadId;

        if (!threadId || threadId === "new" || threadId === "new chat") {
            const title = await generateTitle(prompt);
            const thread = await Thread.create({ userId: user._id, title });
            threadId = thread._id.toString();
        } else {
            const thread = await Thread.findOne({ _id: threadId, userId: user._id });
            if (!thread) {
                // Refund pre-deduction if thread not found
                await User.findByIdAndUpdate(user._id, { $inc: { tokens: MIN_TOKENS_PRE_DEDUCT } });
                return NextResponse.json({ message: "Thread not found" }, { status: 404 });
            }
        }

        // ── Conversation history ─────────────────────────────────────────────
        const messageHistory = await Conversation.find({ ThreadId: threadId }).sort({ createdAt: 1 });

        const formattedHistory = messageHistory
            .filter((msg) => msg.message?.trim())
            .map((msg) => ({
                role: msg.sender === "ai" ? "assistant" : "user",
                content: msg.message,
            }));

        formattedHistory.push({ role: "user", content: prompt });

        // ── Tools ────────────────────────────────────────────────────────────
        const tools = {
            searchKnowledge: tool({
                description: "Search the knowledge base for relevant information to answer the user question. Call this whenever the user asks a factual, procedural, or knowledge-based question, or asks you to retry/search again.",
                inputSchema: z.object({
                    query: z
                        .string()
                        .describe(
                            "A focused, self-contained search query capturing the core information need of the user's question. Rephrase or expand ambiguous references (e.g. resolve \"it\"/\"that\" using conversation context) into a clear standalone query optimized for retrieval."
                        ),
                }),
                execute: async ({ query }) => {
                    const userEmbedding = await generateBatchEmbeddings(query);
                    const hybridResult = await hybridSearch(query, userEmbedding, user._id);
                    return hybridResult.map((chunk) => chunk.content).join("\n\n");
                },
            }),
        };

        // ── RAG retrieval ────────────────────────────────────────────────────
        const userEmbedding = await generateBatchEmbeddings(prompt);
        const hybridResult = await hybridSearch(prompt, userEmbedding, user._id);

        const cleanSources = Array.isArray(hybridResult)
            ? hybridResult.map((v) => ({
                knowledgeId: v.knowledgeId ? v.knowledgeId.toString() : "",
                content: v.content || "",
                score: v.score || 0,
            }))
            : [];

        const result = await generateResponse(buildSystemPrompt(), formattedHistory, tools);

        // ── SSE Stream ───────────────────────────────────────────────────────
        let fullResponse = "";
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Send sources + threadId metadata upfront
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ sources: cleanSources, threadId })}\n\n`
                        )
                    );

                    for await (const chunk of result.textStream) {
                        fullResponse += chunk;
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
                        );
                    }

                    // ── Persist conversation ─────────────────────────────────
                    await Conversation.create({
                        ThreadId: threadId,
                        userId: user._id,
                        sender: "user",
                        message: prompt,
                    });

                    const ai_response = await Conversation.create({
                        ThreadId: threadId,
                        userId: user._id,
                        sender: "ai",
                        message: fullResponse,
                        sources: cleanSources,
                    });

                    // ── Record token usage ───────────────────────────────────
                    const usageDoc = await updateUsage(user._id, ai_response._id, threadId);
                    const actualTokens = usageDoc?.totalUsage ?? 0;

                    // ── Reconcile actual vs pre-deducted cost ────────────────
                    // actualTokens is the true cost; we already deducted MIN_TOKENS_PRE_DEDUCT.
                    // If actual > pre-deducted: deduct the difference.
                    // If actual < pre-deducted: refund the surplus.
                    const delta = actualTokens - MIN_TOKENS_PRE_DEDUCT;
                    // delta > 0  →  user owes more  →  deduct additional
                    // delta < 0  →  user overpaid   →  refund surplus
                    // delta == 0 →  exact, no adjustment needed

                    let finalUser;
                    if (delta !== 0) {
                        finalUser = await User.findByIdAndUpdate(
                            user._id,
                            { $inc: { tokens: -delta } }, // negative delta = refund
                            { new: true }
                        );
                    } else {
                        finalUser = await User.findById(user._id).lean();
                    }

                    // Guard: ensure tokens never go below 0 due to edge cases
                    if (finalUser && finalUser.tokens < 0) {
                        await User.findByIdAndUpdate(user._id, { tokens: 0 });
                        finalUser.tokens = 0;
                    }

                    const remainingTokens = finalUser?.tokens ?? 0;

                    // ── Log usage transaction ─────────────────────────────────
                    await Transaction.create({
                        userId: user._id,
                        type: "usage",
                        tokensUsed: actualTokens,
                        amountDeducted: actualTokens,
                        balanceAfter: remainingTokens,
                        chatSessionId: threadId,
                        paymentId: null,
                    });

                    // ── Low-balance flag ──────────────────────────────────────
                    // Backend is source of truth: ₹10 = 50,000 tokens
                    const lowBalanceWarning = remainingTokens < LOW_BALANCE_THRESHOLD;

                    // ── Update thread timestamp ───────────────────────────────
                    await Thread.findByIdAndUpdate(threadId, { updatedAt: new Date() });
                    const threadInfo = await Thread.findById(threadId);

                    // ── Final SSE event ───────────────────────────────────────
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
                                remainingTokens,
                                lowBalanceWarning,
                            })}\n\n`
                        )
                    );

                    controller.close();
                } catch (err) {
                    // Refund the pre-deduction on unexpected stream errors
                    try {
                        await User.findByIdAndUpdate(user._id, {
                            $inc: { tokens: MIN_TOKENS_PRE_DEDUCT },
                        });
                    } catch (_) { /* best-effort */ }

                    controller.enqueue(
                        encoder.encode(
                            `event: error\n` +
                            `data: ${JSON.stringify({ message: err.message })}\n\n`
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
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}