import crypto from "crypto";
import { NextResponse } from "next/server";
import Payment from "@/models/payment";
import User from "@/models/users";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

function verifySignature(rawBody, signature, secret) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  // timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false; // length mismatch etc.
  }
}

export async function POST(req) {
  try {
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Raw body is required for signature verification
    const rawBody = await req.text();

    const isValid = verifySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const body = JSON.parse(rawBody);
    const event = body.event;
    const payment = body.payload?.payment?.entity;

    if (!payment) {
      return NextResponse.json({ error: "Payment data not found" }, { status: 400 });
    }
    switch (event) {
      case "payment.authorized": {
        // Payment authorized but not yet captured (relevant if you don't use auto-capture)
        await Payment.findOneAndUpdate(
          { paymentId: payment.id },
          {
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            status: "authorized",
            method: payment.method,
            email: payment.notes.email,
            contact: payment.contact,
          },
          { upsert: true, new: true }
        );
        break;
      }

      case "payment.captured": {
        // Money actually captured — this is your "payment successful" source of truth
        await Payment.findOneAndUpdate(
          { paymentId: payment.id },
          {
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            status: "captured",
            method: payment.method,
            email: payment.notes.email,
            contact: payment.contact,
            capturedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        await User.findOneAndUpdate(
          { email: payment.notes.email },
          {
            isPremium: true,
            amount: payment.amount,
            paymentId: payment.id,         
          },
          { upsert: true, new: true }
        );

        // TODO: fulfil order, send confirmation email, update order status, etc.
        break;
      }

      case "payment.failed": {
        await Payment.findOneAndUpdate(
          { paymentId: payment.id },
          {
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            status: "failed",
            method: payment.method,
            errorCode: payment.error_code,
            errorDescription: payment.error_description,
          },
          { upsert: true, new: true }
        );

        // TODO: notify user, log failure reason, etc.
        break;
      }

      default: {
        console.log("Unhandled Razorpay event:", event);
        // Still return 200 so Razorpay doesn't keep retrying unknown events
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}