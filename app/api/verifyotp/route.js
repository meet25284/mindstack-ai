import User from "@/models/users";
import { createToken } from "@/services/jwt";
import { verifyEmail, verifyOTP } from "@/services/mail";
import { NextResponse } from "next/server";

export async function POST(req) {
    const body = await req.json();

    const { email, otp } = body;

    const verified = verifyOTP(
        email,
        otp
    );

    if (!verified) {
        return NextResponse.json({
            message: "Invalid OTP"
        }, { status: 400 });
    } else if (verified) {
        const user = await User.findOne({ email: body.email })
        if (!user) {
            return NextResponse.json({
                message: "User not found"
            }, { status: 404 });
        }
        if (user.isVerified == false) {
            await verifyEmail(body.email)
            return NextResponse.json({
                message: "Please verify your email"
            }, { status: 400 });
        }
        
        
        const token = createToken(user._id);
        return NextResponse
            .json({
                message: "Login successful",
                token: token,
            }, { status: 200 });
    }
};