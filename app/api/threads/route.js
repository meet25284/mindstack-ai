import { isAuthenticated } from "@/middleware/auth";
import Thread from "@/models/thread";
import { NextResponse } from "next/server";


export async function GET(req) {
    try {
        const user = await isAuthenticated(req)
        if (user.status !== (401 || 404)) {
            const userId = user._id;

            const threads = await Thread.find({ userId }).sort({
                updatedAt: -1,
            });

            return NextResponse.json(threads, {
                status: 200,
            });
        } else {
            return NextResponse.json({
                message: "Unauthorized"
            }, { status: 401 })
        }
    } catch (error) {
        return NextResponse.json(
            {
                message: error.message,
            },
            {
                status: 500,
            }
        );
    }
}