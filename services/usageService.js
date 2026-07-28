import connectDB from "@/services/mongoConnect";
import Usage from "@/models/usage";
import Thread from "@/models/thread";
import mongoose from "mongoose";

/**
 * Service to fetch token usage records for a specific conversation (thread) owned by a user.
 * 
 * @param {string} conversationId - Thread ID or AI response ID
 * @param {string} userId - Authenticated User ID
 * @returns {Promise<{ records: Array, summary: Object }>} Usage records and overall conversation summary
 */
export async function getUsageByConversationId(conversationId, userId) {
    await connectDB();

    if (!conversationId || conversationId === "new" || !mongoose.Types.ObjectId.isValid(conversationId)) {
        return {
            records: [],
            summary: {
                totalUsage: 0,
                totalEmbeddingToken: 0,
                titleGenerationToken: { prompt: 0, output: 0, total: 0 },
                responseGenerationToken: { prompt: 0, output: 0, total: 0 },
                recordCount: 0,
            },
        };
    }

    // Verify ownership of thread if threadId exists
    const thread = await Thread.findOne({ _id: conversationId, userId });
    if (!thread) {
        // Also check if conversationId is a direct aiResponseId owned by this user
        const sampleUsage = await Usage.findOne({ aiResponseId: conversationId, userId });
        if (!sampleUsage) {
            const error = new Error("Conversation not found or access denied");
            error.status = 404;
            throw error;
        }
    }

    // Query usage records for this conversation/thread belonging to the user
    const records = await Usage.find({
        userId,
        $or: [
            { threadId: conversationId },
            { aiResponseId: conversationId },
        ],
    })
        .sort({ createdAt: -1 })
        .lean();

    // Compute cumulative metrics across all records in this conversation
    const summary = records.reduce(
        (acc, r) => {
            acc.totalUsage += r.totalUsage || 0;
            acc.totalEmbeddingToken += r.embeddingToken || 0;

            acc.titleGenerationToken.prompt += r.titleGenerationToken?.prompt || 0;
            acc.titleGenerationToken.output += r.titleGenerationToken?.output || 0;
            acc.titleGenerationToken.total += r.titleGenerationToken?.total || 0;

            acc.responseGenerationToken.prompt += r.responseGenerationToken?.prompt || 0;
            acc.responseGenerationToken.output += r.responseGenerationToken?.output || 0;
            acc.responseGenerationToken.total += r.responseGenerationToken?.total || 0;

            acc.recordCount += 1;
            return acc;
        },
        {
            totalUsage: 0,
            totalEmbeddingToken: 0,
            titleGenerationToken: { prompt: 0, output: 0, total: 0 },
            responseGenerationToken: { prompt: 0, output: 0, total: 0 },
            recordCount: 0,
        }
    );

    return { records, summary };
}
