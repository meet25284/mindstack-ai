import { isAuthenticated } from "@/middleware/auth";
import { getUsageByConversationId } from "@/services/usageService";
import { NextResponse } from "next/server";

/**
 * GET /api/usage/:conversationId
 * Returns token usage history for a given conversation (threadId or aiResponseId).
 * Requires authentication and verifies conversation ownership.
 */
export async function GET(req, { params }) {
    try {
        const user = await isAuthenticated(req);
        
        // Check if authentication failed
        if (!user || user.status === 401 || user.status === 404) {
            return NextResponse.json(
                { message: "Unauthorized access" },
                { status: 401 }
            );
        }

        const { conversationId } = await params;

        if (!conversationId) {
            return NextResponse.json(
                { message: "Conversation ID is required" },
                { status: 400 }
            );
        }

        const { records, summary } = await getUsageByConversationId(
            conversationId,
            user._id
        );

        return NextResponse.json(
            {
                success: true,
                conversationId,
                summary,
                data: records,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("GET /api/usage/[conversationId] error:", error);
        
        const statusCode = error.status || 500;
        return NextResponse.json(
            {
                success: false,
                message: error.message || "Failed to fetch usage history",
            },
            { status: statusCode }
        );
    }
}
