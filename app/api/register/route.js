import User from "@/models/users";
import { welcomeEmail } from "@/services/mail";
import { registerValidater } from "@/validations/validate";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import connectDB from "@/services/mongoConnect";

export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();
        console.log("🚀 ~ POST ~ body:", body)

        const result = registerValidater.safeParse(body);
        console.log("🚀 ~ POST ~ result:", result)

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: result.error.issues,
                },
                { status: 400 }
            );
        }

        console.log("🚀 ~ POST ~ body:", body)
        const exist = await User.findOne({ email: body.email });
        console.log("🚀 ~ POST ~ exist:", exist)

        if (exist) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email already exists",
                },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);

        await User.create({
            name: body.name,
            email: body.email,
            password: hashedPassword,
        });

        await welcomeEmail(body.email);

        return NextResponse.json({
            success: true,
            message: "User created successfully",
        });
    } catch (err) {
        console.log("🚀 ~ POST ~ err:", err.message)
        return NextResponse.json(
            {
                success: false,
                message: err.message,
            },
            { status: 500 }
        );
    }
}