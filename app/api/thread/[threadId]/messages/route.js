import Conversation from "@/models/conversation";
import Thread from "@/models/thread";
import { isAuthenticated } from "@/middleware/auth";
import { NextResponse } from "next/server";


export async function GET(req, { params }) {
    const user = await isAuthenticated(req)
    if (user.status !== (401 || 404)) {
        try {

            const userId = user._id;

            const { threadId } = await params; // Next.js 15

            // Check thread ownership
            const thread = await Thread.findOne({
                _id: threadId,
                userId,
            });

            if (!thread) {
                return NextResponse.json(
                    { message: "Thread not found or access denied" },
                    { status: 404 }
                );
            }

            // Get all messages in the thread
            const messages = await Conversation.find({
                ThreadId: threadId,
            }).sort({
                createdAt: 1,
            });

            return NextResponse.json(messages, {
                status: 200,
            });
        } catch (error) {
            return NextResponse.json(
                { message: error.message },
                { status: 500 }
            );
        }
    } else {
        return NextResponse.json({
            message: "Unauthorized"
        }, { status: 401 })
    }
}