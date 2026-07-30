import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import configDotenv from "dotenv";

configDotenv.config();

export async function POST(req) {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return NextResponse.json(
        { message: "Razorpay credentials missing or unconfigured" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const amount = Number(body.amount);

    // Minimum amount requirement: 100 paise (₹1.00)
    if (isNaN(amount) || amount < 100) {
      return NextResponse.json(
        { message: "Amount is required and must be at least 100 paise" },
        { status: 400 }
      );
    }

    const currency = body.currency || "INR";
    const receipt = body.receipt || `receipt_${Date.now()}`;

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

      console.log("🚀 ~ POST ~ body.notes:", body.notes)
    const order = await razorpay.orders.create({
      amount: Math.round(amount),
      currency,
      receipt,
      notes: body.notes || {},
    });

    return NextResponse.json(
      {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: key_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Razorpay create-order error:", error);

    const isAuthError =
      error?.statusCode === 401 ||
      error?.error?.description === "Authentication failed";

    const errorMessage = isAuthError
      ? "Razorpay authentication failed: Invalid or expired RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in .env"
      : error?.error?.description || error?.message || "Failed to create order";

    return NextResponse.json(
      { message: errorMessage },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
