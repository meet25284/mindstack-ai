'use client';

import React, { useState } from 'react';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Check, Zap } from 'lucide-react';


export default function CheckoutPage() {
  
  const [selectedPlan, setSelectedPlan] = useState({
    id: 'pro',
    name: 'Mindstack Pro Plan',
    amount: 500,
    description: '100k Credits + Unlimited Vector Databases + Priority AI Support',
  });

  const plans = [
    {
      id: 'starter',
      name: 'Mindstack Starter',
      amount: 100,
      description: '10,000 AI Credits for personal projects',
      features: ['10k AI Credits', '2 Knowledge Bases', 'Standard Response Time'],
    },
    {
      id: 'pro',
      name: 'Mindstack Pro Plan',
      amount: 500,
      description: '100,000 AI Credits + Unlimited Knowledge Bases',
      features: ['100k AI Credits', 'Unlimited Knowledge Bases', 'Priority Processing', 'API Access'],
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Pass',
      amount: 1500,
      description: 'Full Platform Access with Dedicated Support',
      features: ['500k AI Credits', 'Custom Integrations', '24/7 Dedicated Support', 'SLA Guarantee'],
    },
  ];
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-4">
        <Link
          href="/chat"
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

      <main className="max-w-5xl mx-auto w-full my-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Select Plan */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Select your Subscription Plan</h1>
            <p className="text-slate-400 mt-2">
              Choose a plan that fits your AI workflow. Payments are processed securely via Razorpay.
            </p>
          </div>

          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${selectedPlan.id === plan.id
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" /> Most Popular
                  </span>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{plan.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white">₹{plan.amount}</span>
                    <span className="text-xs text-slate-500 block">INR</span>
                  </div>
                </div>

                <ul className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Razorpay Checkout Component */}
        <div className="lg:col-span-5 sticky top-8">
          <RazorpayCheckout
            amountInRupees={selectedPlan.amount}
            itemName={selectedPlan.name}
            description={selectedPlan.description}
          />
        </div>
      </main>

      <footer className="max-w-5xl mx-auto w-full py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        Mindstack AI &copy; 2026. Razorpay Standard Checkout Integration.
      </footer>
    </div>
  );
}
