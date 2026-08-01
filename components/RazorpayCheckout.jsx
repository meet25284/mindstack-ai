'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';

const loadScript = (src) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(false); return; }
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * RazorpayCheckout
 *
 * Props:
 *  amountInRupees  — amount to charge (rupees, integer). Pass 0 when disabled.
 *  tokensToReceive — tokens the user will receive (display only; server recomputes).
 *  itemName        — display title
 *  description     — display sub-text
 *  disabled        — when true, disables the Pay button
 *  onPaymentSuccess — optional callback(verifyData) after successful verification
 *  email           — prefill email in Razorpay modal
 */
export default function RazorpayCheckout({
  amountInRupees = 0,
  tokensToReceive = 0,
  itemName = 'Mindstack AI Tokens',
  description = 'AI token top-up',
  disabled = false,
  onPaymentSuccess = null,
  email,
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'warning', text, details? }

  const handleCheckout = async () => {
    setLoading(true);
    setStatus(null);

    try {
      // ── Fetch user email from token ───────────────────────────────────────
      const getMail = async () => {
        const res = await fetch(`/api/verify-email/${localStorage.getItem('token')}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token'),
          },
        });
        const data = await res.json();
        return data.email;
      };

      // ── Load Razorpay SDK ─────────────────────────────────────────────────
      const sdkLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!sdkLoaded) {
        setStatus({ type: 'error', text: 'Failed to load Razorpay SDK. Please check your connection.' });
        setLoading(false);
        return;
      }

      // Convert rupees → paise (server validates this too)
      const amountInPaise = Math.round(Number(amountInRupees) * 100);

      // ── Call backend to create Razorpay order ─────────────────────────────
      // Pass tokensToReceive in notes for informational logging.
      // The server RECOMPUTES and VERIFIES the token count from the amount
      // before crediting — client value is never trusted alone.
      const userEmail = await getMail();
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            email: userEmail,
            // Informational only — webhook recomputes from captured amount
            tokens_requested: tokensToReceive,
          },
        }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.order_id) {
        setStatus({ type: 'error', text: orderData.message || 'Failed to create order on server.' });
        setLoading(false);
        return;
      }

      // ── Configure Razorpay modal ──────────────────────────────────────────
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Mindstack AI',
        description,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            setLoading(true);
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              setStatus({
                type: 'success',
                text: 'Payment verified! Your tokens will be credited shortly.',
                details: {
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                },
              });
              onPaymentSuccess?.(verifyData);
            } else {
              setStatus({ type: 'error', text: verifyData.message || 'Payment signature verification failed.' });
            }
          } catch {
            setStatus({ type: 'error', text: 'An error occurred while verifying your payment.' });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setStatus({ type: 'warning', text: 'Payment checkout was cancelled.' });
            setLoading(false);
          },
        },
        prefill: { email },
        theme: { color: '#6366f1' },
      };
      console.log("🚀 ~ handleCheckout ~ options:", options)

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      setStatus({ type: 'error', text: err.message || 'An unexpected error occurred during checkout.' });
      setLoading(false);
    }
  };

  const canPay = !disabled && !loading && amountInRupees > 0;

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl transition-all">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{itemName}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <CreditCard className="w-6 h-6" />
        </div>
      </div>

      {/* ── Live summary ── */}
      <div className="rounded-xl bg-slate-950/60 border border-slate-800/60 divide-y divide-slate-800/60 mb-5">
        {/* Amount */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-slate-400">Amount</span>
          <span className="text-sm font-semibold text-slate-200">
            {amountInRupees > 0 ? `₹${amountInRupees.toLocaleString('en-IN')}` : '—'}
          </span>
        </div>

        {/* Tokens */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            AI Tokens
          </div>
          <span className="text-sm font-bold font-mono text-indigo-300">
            {tokensToReceive > 0 ? `+${tokensToReceive.toLocaleString()}` : '—'}
          </span>
        </div>

        {/* Taxes note */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs text-slate-500">Taxes &amp; Fees</span>
          <span className="text-xs text-slate-500">Included</span>
        </div>

        {/* Total Due */}
        <div className="flex items-baseline justify-between px-4 py-3 bg-slate-800/30 rounded-b-xl">
          <span className="text-sm font-bold text-slate-300">Total Due</span>
          <div className="text-right">
            <span className="text-2xl font-black text-white">
              {amountInRupees > 0 ? `₹${amountInRupees.toLocaleString('en-IN')}` : '₹0'}
            </span>
            <span className="text-xs text-slate-500 block">INR (All inclusive)</span>
          </div>
        </div>
      </div>

      {/* ── Status banner ── */}
      {status && (
        <div
          className={`p-4 mb-5 rounded-xl flex items-start gap-3 text-sm animate-fade-in ${
            status.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : status.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium">{status.text}</p>
          </div>
        </div>
      )}

      {/* ── Pay button ── */}
      <button
        id="razorpay-pay-btn"
        onClick={handleCheckout}
        disabled={!canPay}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing Order...</span>
          </>
        ) : status?.type === 'success' ? (
          <>
            <RefreshCw className="w-5 h-5" />
            <span>Pay Again (₹{amountInRupees.toLocaleString('en-IN')})</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" />
            <span>
              {amountInRupees > 0
                ? `Pay ₹${amountInRupees.toLocaleString('en-IN')} with Razorpay`
                : 'Pay Now with Razorpay'}
            </span>
          </>
        )}
      </button>

      {/* ── Trust badge ── */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>256-bit SSL Secure Payment powered by Razorpay</span>
      </div>
    </div>
  );
}
