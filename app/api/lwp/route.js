import User from "@/models/users";
import { LoginValidater } from "@/validations/validate";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { createToken } from "@/services/jwt";
import { verifyEmail, welcomeEmail } from "@/services/mail";

export async function POST(req) {
  try {
    const body = await req.json();

    const { data, error } = LoginValidater.safeParse(body);

    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: error.issues[0]?.message || "Validation failed" 
        },
        { status: 400 }
      );
    }

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
        

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid password" },
        { status: 401 }
      );
    }

    const token = createToken(user._id);

    await welcomeEmail(user.email);

    return NextResponse.json(
      {
        message: "Login successful",
        token,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}