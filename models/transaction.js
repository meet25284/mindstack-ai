import mongoose from "mongoose";

const { Schema, models, model } = mongoose;

/**
 * Transaction — immutable audit log for every token movement.
 *
 * type "purchase" : tokens added to a user's balance after a captured payment.
 * type "usage"    : tokens deducted when the user sends a chat message.
 *
 * Conversion rate: 1 paisa = 50 tokens  →  ₹1 = 5,000 tokens
 * Low-balance threshold: ₹10 = 1,000 paise = 50,000 tokens
 */
const TransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // "purchase" when webhook credits tokens; "usage" when chat deducts tokens
    type: {
      type: String,
      required: true,
      enum: ["purchase", "usage"],
    },

    // For "usage": actual tokens consumed by this message (always positive).
    // For "purchase": tokens added (same magnitude, stored positive).
    tokensUsed: {
      type: Number,
      required: true,
      min: 0,
    },

    // Tokens actually removed from the balance (0 for purchase type).
    amountDeducted: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // Snapshot of user.tokens AFTER this operation — for audit / drift detection.
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    // Thread / session ID this message belongs to (null for purchase).
    chatSessionId: {
      type: String,
      default: null,
    },

    // Razorpay paymentId for purchase-type transactions (null for usage).
    paymentId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt / updatedAt
    versionKey: false,
  }
);

// Primary lookup: all transactions for a user, newest first.
TransactionSchema.index({ userId: 1, createdAt: -1 });
// Breakdown by type (e.g. "all usage records for user X").
TransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

const Transaction = models.Transaction || model("Transaction", TransactionSchema);
export default Transaction;
