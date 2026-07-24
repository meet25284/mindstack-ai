"use client";

import { Database, ShieldAlert, UploadCloud, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export default function GroundedEmptyState({ type = "onboarding", onSampleClick }) {
  if (type === "no_answer") {
    return (
      <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 space-y-3 my-4">
        <div className="flex items-center gap-2.5 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Out of Knowledge Base Scope</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          MindStack AI is strictly grounded and does not generate unverified information outside your uploaded documents. No matching passages met the minimum vector similarity threshold (≥ 70%) for this query.
        </p>
        <div className="pt-2 flex items-center gap-3 text-xs font-semibold">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload Document
          </Link>
          <Link
            href="/knowledge"
            className="text-amber-700 dark:text-amber-300 hover:underline"
          >
            Browse Uploaded Knowledge
          </Link>
        </div>
      </div>
    );
  }

  // Onboarding starter state
  const starterQuestions = [
    "Summarize key findings from our latest uploaded document.",
    "What vector similarity threshold is configured for grounding?",
    "Explain how document chunking works in MindStack AI.",
    "What security constraints apply to file access?",
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 sm:p-12 space-y-8 max-w-2xl mx-auto my-auto animate-fade-in-up">
      {/* Icon Shield Header */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xl shadow-indigo-500/10">
          <Database className="w-10 h-10" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 text-white flex items-center justify-center shadow-md">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          MindStack AI Grounded Assistant
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
          Answers are strictly retrieved and synthesized from your private Knowledge Base. No ungrounded hallucinations or generic web guesswork.
        </p>
      </div>

      {/* Starter Questions */}
      <div className="w-full space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Suggested Queries
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {starterQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => onSampleClick && onSampleClick(q)}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all shadow-sm group"
            >
              <div className="flex items-start justify-between gap-2">
                <span>"{q}"</span>
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 shrink-0 mt-0.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
