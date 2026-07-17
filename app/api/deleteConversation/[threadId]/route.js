import { isAuthenticated } from "@/middleware/auth";
import Conversation from "@/models/conversation";
import Thread from "@/models/thread";
import { NextResponse } from "next/server";

export async function DELETE(req, { params }) {
    try {
        const user = await isAuthenticated(req)
        if (user.status !== (401 || 404)) {
            const userId = user._id;

            const { threadId } = await params;

            const thread = await Thread.findOneAndDelete({
                _id: threadId,
                userId,
            });

            if (!thread) {
                return NextResponse.json(
                    { message: "Thread not found or access denied" },
                    { status: 404 }
                );
            }

            await Conversation.deleteMany({
                ThreadId: threadId,
            });

            return NextResponse.json(
                { message: "Thread and history deleted successfully" },
                { status: 200 }
            );
        }
        else {
            return NextResponse.json({
                message: "Unauthorized"
            }, { status: 401 })
        }
    } catch (error) {
        console.error("Delete Thread Error:", error);

        return NextResponse.json(
            { message: "Internal Server Error" },
            { status: 500 }
        );
    }
}