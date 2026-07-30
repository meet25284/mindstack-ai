'use client';

import React, { useState } from 'react';
import { CreditCard, CheckCircle2, AlertCircle, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';


const loadScript = (src) => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function RazorpayCheckout({
  amountInRupees = 500,
  itemName = 'Mindstack AI Pro Subscription',
  description = 'Access to high-speed AI models & unlimited knowledge bases',
  onPaymentSuccess = null,
  email
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error' | 'warning', text: '', details?: any }

  const handleCheckout = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const getMail = async () => {
        const res = await fetch(`/api/verify-email/${localStorage.getItem('token')}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": localStorage.getItem('token')
          }
        })
        const data = await res.json()
        return data.email
      }

      // 1. Ensure Razorpay SDK script is loaded
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
        setStatus({
          type: 'error',
          text: 'Failed to load Razorpay SDK. Please check your internet connection.',
        });
        setLoading(false);
        return;
      }

      // Convert amount in Rupees to paise (1 INR = 100 paise)
      const amountInPaise = Math.round(Number(amountInRupees) * 100);

      if (amountInPaise < 100) {
        setStatus({
          type: 'error',
          text: 'Minimum amount must be at least ₹1.00 (100 paise).',
        });
        setLoading(false);
        return;
      }

      // 2. Call backend /api/create-order
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            item_name: itemName,
            email: await getMail()
          },
        }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.order_id) {
        setStatus({
          type: 'error',
          text: orderData.message || 'Failed to create order on server.',
        });
        setLoading(false);
        return;
      }

      // 3. Configure Razorpay modal options
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Mindstack AI',
        description: description,
        order_id: orderData.order_id,
        handler: async function (response) {
          // On modal payment success
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
                text: 'Payment verified successfully! Thank you for your purchase.',
                details: {
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                },
              });
              if (onPaymentSuccess) {
                onPaymentSuccess(verifyData);
              }
            } else {
              setStatus({
                type: 'error',
                text: verifyData.message || 'Payment signature verification failed.',
              });
            }
          } catch (verifyError) {
            setStatus({
              type: 'error',
              text: 'An error occurred while verifying your payment.',
            });
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setStatus({
              type: 'warning',
              text: 'Payment checkout was cancelled.',
            });
            setLoading(false);
          },
        },
        prefill: {
          email: email,
        },
        theme: {
          color: '#6366f1',
        },
      };

      const razorpayWindow = new window.Razorpay(options);

      // Handle payment failure event
      // razorpayWindow.on('payment.failed', function (response) {
      //   console.error('Razorpay payment failed:', response.error);
      //   setStatus({
      //     type: 'error',
      //     text: response.error?.description || 'Payment processing failed. Please try again.',
      //     details: {
      //       code: response.error?.code,
      //       source: response.error?.source,
      //       step: response.error?.step,
      //       reason: response.error?.reason,
      //     },
      //   });
      //   setLoading(false);
      // });

      razorpayWindow.open();
    } catch (err) {
      console.error('Razorpay checkout error:', err);
      setStatus({
        type: 'error',
        text: err.message || 'An unexpected error occurred during checkout.',
      });
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl transition-all">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{itemName}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <CreditCard className="w-6 h-6" />
        </div>
      </div>

      <div className="flex items-baseline justify-between py-2 mb-6">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Due</span>
        <div className="text-right">
          <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">₹{amountInRupees}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 block">INR (Includes taxes)</span>
        </div>
      </div>

      {status && (
        <div
          className={`p-4 mb-5 rounded-xl flex items-start gap-3 text-sm animate-fade-in ${status.type === 'success'
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
            {status.details && (
              <div className="mt-2 text-xs font-mono space-y-1 opacity-90 border-t border-emerald-200/60 dark:border-emerald-800/60 pt-2">
                <div>Payment ID: {status.details.paymentId}</div>
                <div>Order ID: {status.details.orderId}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing Order...</span>
          </>
        ) : status?.type === 'success' ? (
          <>
            <RefreshCw className="w-5 h-5" />
            <span>Pay Again (₹{amountInRupees})</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5" />
            <span>Pay Now with Razorpay</span>
          </>
        )}
      </button>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>256-bit SSL Secure Payment powered by Razorpay</span>
      </div>
    </div>
  );
}
