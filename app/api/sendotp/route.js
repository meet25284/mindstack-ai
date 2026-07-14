import User from "@/models/users";
import { sendOTP } from "@/services/mail";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body.email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: body.email });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email" },
        { status: 404 }
      );
    }

    await sendOTP(user.email);

    return NextResponse.json(
      { message: "OTP sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}