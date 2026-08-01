import User from "@/models/users";
import { verifyToken } from "@/services/jwt";
import { redirect } from "next/navigation";
export const GET = async (req, { params }) => {
    const token = (await params).token;
    const decodedToken = verifyToken(token);
    console.log("🚀 ~ GET ~ decodedToken:", decodedToken)
    if (!decodedToken) {
        return Response.json({ error: "Invalid token" }, { status: 400 });
    }
    const user = await User.findOne({ _id: decodedToken });
    console.log("🚀 ~ GET ~ user:", user)
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
    }
    user.isVerified = true;
    await user.save();
    redirect("/login")
}   