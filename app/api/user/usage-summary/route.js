// app/api/user/usage-summary/route.js

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/middleware/auth";
import connectDB from "@/services/mongoConnect";
import User from "@/models/users";
import Transaction from "@/models/transaction";
import mongoose from "mongoose";

// Conversion constants — single source of truth
const TOKENS_PER_PAISA = 50;          // 1 paisa = 50 tokens
const LOW_BALANCE_THRESHOLD = 50_000; // ₹10 = 50,000 tokens

export async function GET(req) {
    try {
        await connectDB();

        // ── Auth ─────────────────────────────────────────────────────────────
        const user = await isAuthenticated(req);
        if (user.status === 401 || user.status === 404) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const userId = user._id;

        // ── Fetch fresh user balance ──────────────────────────────────────────
        const freshUser = await User.findById(userId).lean();
        if (!freshUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        const remainingTokens = freshUser.tokens ?? 0;
        const tokensLifetimePurchased = freshUser.tokensLifetimePurchased ?? 0;

        // ── Lifetime tokens used ─────────────────────────────────────────────
        // Sum all "usage" type transactions for this user
        const lifetimeUsageAgg = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    type: "usage",
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$tokensUsed" },
                },
            },
        ]);
        const tokensLifetimeUsed = lifetimeUsageAgg[0]?.total ?? 0;

        // ── Daily usage — last 30 days ────────────────────────────────────────
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyUsageAgg = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    type: "usage",
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    tokensUsed: { $sum: "$tokensUsed" },
                },
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    tokensUsed: 1,
                },
            },
        ]);

        // ── Recent transactions — last 20 (purchases + usage combined) ─────────
        const recentTransactions = await Transaction.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        // ── Low-balance flag ─────────────────────────────────────────────────
        const lowBalanceWarning = remainingTokens < LOW_BALANCE_THRESHOLD;

        // ── Derived ₹ values (for display) ──────────────────────────────────
        // tokens ÷ TOKENS_PER_PAISA = paise  →  ÷ 100 = ₹
        const remainingRupees = (remainingTokens / TOKENS_PER_PAISA / 100).toFixed(2);
        const purchasedRupees = (tokensLifetimePurchased / TOKENS_PER_PAISA / 100).toFixed(2);
        const usedRupees = (tokensLifetimeUsed / TOKENS_PER_PAISA / 100).toFixed(2);

        return NextResponse.json({
            remainingTokens,
            tokensLifetimePurchased,
            tokensLifetimeUsed,
            lowBalanceWarning,
            lowBalanceThreshold: LOW_BALANCE_THRESHOLD,
            rupees: {
                remaining: Number(remainingRupees),
                purchased: Number(purchasedRupees),
                used: Number(usedRupees),
            },
            dailyUsage: dailyUsageAgg,
            recentTransactions,
        });
    } catch (err) {
        console.error("usage-summary error:", err);
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}
