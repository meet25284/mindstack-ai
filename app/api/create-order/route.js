import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import configDotenv from "dotenv";

configDotenv.config();

// ── Billing constants (keep in sync with checkout page and webhook) ────────────
// 1 paisa = 50 tokens  →  ₹1 = 100 paise = 5,000 tokens
const TOKENS_PER_PAISA = 50;

// Minimum order: ₹50 = 5,000 paise
const MIN_AMOUNT_PAISE = 5_000;

// Maximum order: ₹1,00,000 = 1,00,00,000 paise
const MAX_AMOUNT_PAISE = 1_00_00_000;

export async function POST(req) {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
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

    const amount = Math.round(Number(body.amount)); // paise, integer

    // ── Server-side validation ─────────────────────────────────────────────
    if (isNaN(amount) || amount < MIN_AMOUNT_PAISE) {
      return NextResponse.json(
        {
          message: `Minimum purchase is ₹${MIN_AMOUNT_PAISE / 100} (${MIN_AMOUNT_PAISE} paise).`,
        },
        { status: 400 }
      );
    }

    if (amount > MAX_AMOUNT_PAISE) {
      return NextResponse.json(
        {
          message: `Maximum single purchase is ₹${(MAX_AMOUNT_PAISE / 100).toLocaleString("en-IN")}.`,
        },
        { status: 400 }
      );
    }

    // ── Recompute tokens server-side (never trust client value) ───────────
    // amount is in paise; 1 paisa = TOKENS_PER_PAISA tokens
    const tokensPurchased = amount * TOKENS_PER_PAISA;

    const currency = body.currency || "INR";
    const receipt = body.receipt || `receipt_${Date.now()}`;

    // Merge caller notes with the server-verified token count.
    // The webhook will use payment.amount (from Razorpay) to recompute tokens —
    // tokensPurchased here is for logging/display only in the Razorpay dashboard.
    const notes = {
      ...(body.notes || {}),
      tokens_verified: tokensPurchased,
    };

    const razorpay = new Razorpay({ key_id, key_secret });

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });

    return NextResponse.json(
      {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id,
        tokens_purchased: tokensPurchased, // informational — shown in UI
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
