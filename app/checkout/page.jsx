'use client';

import React, { useState, useCallback, useMemo } from 'react';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Zap, Info } from 'lucide-react';

// ── Conversion constants (single source of truth) ─────────────────────────────
// 1 paisa = 50 tokens  →  ₹1 = 100 paise = 5,000 tokens
// Keep this in sync with the backend (webhook route, create-order route).
const TOKENS_PER_RUPEE = 5_000;
const MIN_AMOUNT_INR = 50;       // ₹50 minimum
const MAX_AMOUNT_INR = 1_00_000; // ₹1,00,000 cap (fat-finger guard)

// Quick-select preset amounts (₹)
const QUICK_AMOUNTS = [100, 500, 1000, 2000];

export default function CheckoutPage() {
  // Raw string from the input (allows empty/partial typing without forcing 0)
  const [rawInput, setRawInput] = useState('');

  // Derive a clean numeric value from the raw input
  const amountRupees = useMemo(() => {
    const n = parseFloat(rawInput);
    if (isNaN(n) || n < 0) return 0;
    // Round to nearest rupee — no fractional paise confusion
    return Math.round(n);
  }, [rawInput]);

  const tokensToReceive = useMemo(
    () => amountRupees * TOKENS_PER_RUPEE,
    [amountRupees]
  );

  // Validation
  const isBelowMin = rawInput !== '' && amountRupees < MIN_AMOUNT_INR;
  const isAboveMax = amountRupees > MAX_AMOUNT_INR;
  const isValid    = amountRupees >= MIN_AMOUNT_INR && !isAboveMax;

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    // Allow digits and at most one decimal point; strip everything else
    if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
      setRawInput(val);
    }
  }, []);

  const handleQuickSelect = useCallback((amount) => {
    setRawInput(String(amount));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* ── Header ── */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-lg">
          <Sparkles className="w-5 h-5" />
          <span>Mindstack AI Checkout</span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto w-full my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── Left: Buy AI Credits card ── */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Buy AI Tokens
            </h1>
            <p className="text-slate-400 mt-2">
              Enter the amount you want to pay. Tokens are credited instantly after
              your payment is confirmed.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-indigo-500/60 bg-indigo-950/30 shadow-lg shadow-indigo-500/10 space-y-6">
            {/* Card title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Buy AI Tokens</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  1 Rupee = {TOKENS_PER_RUPEE.toLocaleString()} tokens
                </p>
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <label
                htmlFor="amount-input"
                className="block text-sm font-semibold text-slate-300"
              >
                Enter Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 select-none">
                  ₹
                </span>
                <input
                  id="amount-input"
                  type="text"
                  inputMode="decimal"
                  value={rawInput}
                  onChange={handleInputChange}
                  placeholder="e.g. 500"
                  autoComplete="off"
                  className={`w-full pl-9 pr-4 py-3.5 rounded-xl text-xl font-bold bg-slate-900 border transition-colors outline-none focus:ring-2 text-white placeholder-slate-600 ${
                    isBelowMin
                      ? 'border-rose-500 focus:ring-rose-500/30'
                      : isAboveMax
                      ? 'border-amber-500 focus:ring-amber-500/30'
                      : 'border-slate-700 focus:ring-indigo-500/40 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Inline validation messages */}
              {isBelowMin && (
                <p className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Minimum purchase is ₹{MIN_AMOUNT_INR}
                </p>
              )}
              {isAboveMax && (
                <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Maximum single purchase is ₹{MAX_AMOUNT_INR.toLocaleString()}.
                  Please contact us for bulk orders.
                </p>
              )}
            </div>

            {/* Quick-select buttons */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Quick Select
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleQuickSelect(amt)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      amountRupees === amt
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-indigo-500/60 hover:text-white'
                    }`}
                  >
                    ₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Token preview */}
            {amountRupees > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-indigo-900/40 border border-indigo-700/40 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>You will receive</span>
                </div>
                <span className="font-black font-mono text-indigo-300 text-lg">
                  {tokensToReceive.toLocaleString()} tokens
                </span>
              </div>
            )}

            {/* Conversion note */}
            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Tokens are credited instantly after payment capture by Razorpay
              (via webhook). Conversion: ₹1 = {TOKENS_PER_RUPEE.toLocaleString()} tokens.
              Prices are inclusive of all taxes.
            </p>
          </div>
        </div>

        {/* ── Right: Live summary + Razorpay ── */}
        <div className="lg:col-span-5 sticky top-8">
          <RazorpayCheckout
            amountInRupees={isValid ? amountRupees : 0}
            tokensToReceive={tokensToReceive}
            itemName="Mindstack AI Tokens"
            description={
              isValid
                ? `Purchasing ₹${amountRupees} → ${tokensToReceive.toLocaleString()} tokens`
                : 'Enter an amount on the left to continue'
            }
            disabled={!isValid}
          />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-5xl mx-auto w-full py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        Mindstack AI &copy; 2026. Razorpay Standard Checkout Integration.
      </footer>
    </div>
  );
}
