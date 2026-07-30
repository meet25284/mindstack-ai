import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

const PaymentSchema = new Schema(
  {
    // Razorpay payment id, e.g. "pay_XXXXXXXXXXXX" — always unique
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Razorpay order id, e.g. "order_XXXXXXXXXXXX"
    orderId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    // Amount is in the smallest currency unit (paise for INR) — store as Number, not float math
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    // Mirrors Razorpay's own payment status vocabulary
    status: {
      type: String,
      required: true,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
      ],
      default: "created",
      index: true,
    },

    // Most recent webhook event received for this payment (audit trail)
    lastEvent: {
      type: String,
      enum: [
        "payment.authorized",
        "payment.captured",
        "payment.failed",
      ],
    },

    method: {
      type: String,
      enum: ["card", "netbanking", "wallet", "upi", "emi", "cardless_emi", "paylater", null],
      default: null,
    },

    // Card details (only present when method === "card")
    card: {
      last4: { type: String, default: null },
      network: { type: String, default: null }, // Visa, Mastercard, etc.
      type: { type: String, default: null }, // credit / debit
      issuer: { type: String, default: null },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    contact: {
      type: String,
      trim: true,
    },

    // Present only when status === "failed"
    errorCode: { type: String, default: null },
    errorDescription: { type: String, default: null },
    errorSource: { type: String, default: null },
    errorStep: { type: String, default: null },
    errorReason: { type: String, default: null },

    // Whether the payment was auto-captured or needs manual capture
    captureMode: {
      type: String,
      enum: ["automatic", "manual", null],
      default: null,
    },

    authorizedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },

    // Keep the full raw webhook payload for debugging / reprocessing / disputes
    rawPayload: {
      type: Schema.Types.Mixed,
      select: false, // excluded by default from queries; opt-in with .select("+rawPayload")
    },

    // Log every webhook event received for this payment (handles retries/duplicates gracefully)
    webhookLogs: [
      {
        event: { type: String },
        receivedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true, // adds createdAt / updatedAt
    versionKey: false,
  }
);

// Compound index for common dashboard queries (e.g. "all captured payments for an order")
PaymentSchema.index({ orderId: 1, status: 1 });
PaymentSchema.index({ createdAt: -1 });

// Reuse model if already compiled (avoids OverwriteModelError in Next.js hot-reload/dev mode)
const Payment = models.Payment || model("Payment", PaymentSchema);

export default Payment;