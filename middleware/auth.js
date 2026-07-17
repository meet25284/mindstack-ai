import User from "@/models/users";
import { verifyToken } from "@/services/jwt";
import { NextResponse } from "next/server";

export async function isAuthenticated(request) {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
        throw new Error("Unauthorized");
    }

    // Support both "Bearer <token>" and a raw token, just in case
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader.trim();

    if (!token) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    }

    const id = await verifyToken(token);

    if (!id) {
        return NextResponse.json({ message: "Invalid Token" }, { status: 401 });
    }

    const user = await User.findById(id);

    if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return user;
}