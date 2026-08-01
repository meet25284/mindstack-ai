'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/* ─── tiny icon components (no external deps) ─────────────────────────────── */
function SpinnerIcon({ className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function CheckIcon({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ZapIcon({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function BookIcon({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function BrainIcon({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function ArrowRightIcon({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

function MailIcon({ className = '' }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

/* ─── Static content ─────────────────────────────────────────────────────── */
const HOW_TO_STEPS = [
  {
    step: '01',
    title: 'Upload Your Knowledge Base',
    description:
      'Go to the Knowledge section and upload PDFs, docs, or paste text. MindStack AI indexes everything into a searchable vector store.',
  },
  {
    step: '02',
    title: 'Ask Questions in Chat',
    description:
      'Open the Chat tab and ask anything. The AI retrieves the most relevant context from your knowledge base before generating a grounded answer.',
  },
  {
    step: '03',
    title: 'Explore & Iterate',
    description:
      'Browse previous conversations, manage your files in the Knowledge hub, and top-up tokens whenever you need more AI processing power.',
  },
];

const FEATURES = [
  { icon: <BrainIcon className="w-4 h-4" />, label: 'RAG-powered answers' },
  { icon: <BookIcon className="w-4 h-4" />, label: 'Multi-doc knowledge base' },
  { icon: <ZapIcon className="w-4 h-4" />, label: 'Lightning-fast retrieval' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function VerifyEmailPage() {
  const { token } = useParams();

  /** 'loading' | 'success' | 'error' | 'missing' */
  const [status, setStatus] = useState(token ? 'loading' : 'missing');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Prevent duplicate calls in React Strict Mode dev double-invoke
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    const verify = async () => {
      try {
        const res = await fetch(`/api/verify-email/${token}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json();

        if (res.ok && data.message) {
          setVerifiedEmail(data.email ?? '');
          setStatus('success');
        } else {
          setErrorMsg(
            data.error ||
              (res.status === 404
                ? 'No account associated with this link was found.'
                : 'The verification link is invalid or has already been used.')
          );
          setStatus('error');
        }
      } catch {
        setErrorMsg('A network error occurred. Please check your connection and try again.');
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 relative overflow-hidden font-sans text-gray-100">
      {/* Ambient background glows */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/15 rounded-full blur-[140px] animate-pulse"
        style={{ animationDuration: '5s' }}
      />
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[140px] animate-pulse"
        style={{ animationDuration: '6s', animationDelay: '1.5s' }}
      />

      <div className="w-full max-w-lg relative z-10">

        {/* ──────────────── LOADING ──────────────── */}
        {status === 'loading' && (
          <div className="bg-gray-900/50 border border-gray-800 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl text-center animate-fade-in-up">
            <BrandHeader />

            <div className="mt-8 flex flex-col items-center gap-5">
              {/* pulsing spinner */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                  <SpinnerIcon className="w-9 h-9 text-indigo-400" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-100">Verifying your email…</h2>
                <p className="text-sm text-gray-500 mt-1">This only takes a moment.</p>
              </div>

              {/* indeterminate progress bar */}
              <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  style={{ animation: 'indeterminate 1.8s ease-in-out infinite' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── SUCCESS ──────────────── */}
        {status === 'success' && (
          <div className="animate-fade-in-up">
            <div className="bg-gray-900/50 border border-gray-800 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl hover:border-gray-700 transition-all duration-500">
              <BrandHeader />

              {/* success icon + heading */}
              <div className="mt-8 flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
                  <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
                    <CheckIcon className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-100">Email Verified! 🎉</h2>
                  {verifiedEmail && (
                    <p className="text-sm text-gray-400 mt-1">
                      <span className="text-indigo-400 font-medium">{verifiedEmail}</span> is now confirmed.
                    </p>
                  )}
                </div>

                {/* feature pills */}
                <div className="flex flex-wrap justify-center gap-2 mt-1">
                  {FEATURES.map((f) => (
                    <span
                      key={f.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                    >
                      {f.icon}
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* divider */}
              <div className="my-7 border-t border-gray-800" />

              {/* About section */}
              <div className="mb-6">
                <SectionLabel icon={<BrainIcon className="w-4 h-4" />} text="About MindStack AI" />
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                  <span className="font-semibold text-gray-200">MindStack AI</span> is an enterprise-grade{' '}
                  <span className="text-indigo-400 font-medium">Retrieval-Augmented Generation (RAG)</span> platform
                  that turns your documents into a smart, searchable knowledge base. Upload PDFs, notes, or any text,
                  then ask questions in plain English — and get accurate, source-grounded answers powered by the latest
                  AI models.
                </p>
              </div>

              {/* How to use */}
              <div>
                <SectionLabel icon={<ZapIcon className="w-4 h-4" />} text="How to Get Started" />
                <ol className="mt-3 space-y-3">
                  {HOW_TO_STEPS.map((s) => (
                    <li
                      key={s.step}
                      className="flex gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-700/50 hover:border-indigo-500/30 transition-colors duration-300"
                    >
                      <span className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-bold flex items-center justify-center">
                        {s.step}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-200">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* CTA buttons */}
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  id="verify-email-cta-btn"
                  href="/login"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/35 transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span>Get Started</span>
                  <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── ERROR / MISSING ──────────────── */}
        {(status === 'error' || status === 'missing') && (
          <div className="bg-gray-900/50 border border-gray-800 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl animate-fade-in-up">
            <BrandHeader />

            <div className="mt-8 flex flex-col items-center text-center gap-4">
              {/* error icon */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl" />
                <div className="relative w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center">
                  {status === 'missing' ? (
                    <MailIcon className="w-9 h-9 text-rose-400" />
                  ) : (
                    <XIcon className="w-9 h-9 text-rose-400" />
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-100">
                  {status === 'missing' ? 'Missing Verification Token' : 'Verification Failed'}
                </h2>
                <p className="text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">
                  {status === 'missing'
                    ? 'No verification token was found in the URL. Please use the link from your verification email.'
                    : errorMsg || 'The verification link is invalid, expired, or has already been used.'}
                </p>
              </div>

              {/* help box */}
              <div className="w-full p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-left">
                <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">What you can do</p>
                <ul className="space-y-1.5 text-xs text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>Check your inbox or spam folder for the original verification email.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>Verification links expire after a set period — register again to receive a new one.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>If your email is already verified, simply log in.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* action buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                id="verify-error-register-btn"
                href="/"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all duration-300 group"
              >
                <span>Register Again</span>
                <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                id="verify-error-login-btn"
                href="/login"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100 text-sm font-medium rounded-xl border border-gray-700 hover:border-gray-600 transition-all duration-300"
              >
                Log In Instead
              </Link>
            </div>
          </div>
        )}

        {/* footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} MindStack AI · All rights reserved.
        </p>
      </div>

      {/* keyframe styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer {
            100% { transform: translateX(100%); }
          }
          @keyframes indeterminate {
            0%   { transform: translateX(-100%) scaleX(0.4); }
            50%  { transform: translateX(0%)    scaleX(0.8); }
            100% { transform: translateX(100%)  scaleX(0.4); }
          }
          @keyframes gradient {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient {
            animation: gradient 3s ease infinite;
          }
        `,
      }} />
    </div>
  );
}

/* ─── Shared sub-components ─────────────────────────────────────────────────*/
function BrandHeader() {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30">
        <ZapIcon className="w-6 h-6 text-white" />
      </div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
        MindStack AI
      </h1>
      <p className="text-gray-500 text-xs font-medium tracking-wide mt-0.5">
        Enterprise RAG Knowledge Assistant
      </p>
    </div>
  );
}

function SectionLabel({ icon, text }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
      {icon}
      {text}
    </div>
  );
}
