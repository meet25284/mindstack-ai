import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      return NextResponse.json(
        { message: "Razorpay secret key unconfigured on server" },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // Validate missing fields (returns 400)
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { message: "Missing required payment verification parameters" },
        { status: 400 }
      );
    }

    // Compute HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const generatedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isSignatureValid = generatedSignature === razorpay_signature;

    if (!isSignatureValid) {
      return NextResponse.json(
        { success: false, message: "Payment signature mismatch" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment verified successfully",
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Razorpay verify-payment error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
