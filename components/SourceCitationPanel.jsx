"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, FileText, CheckCircle2, ExternalLink } from "lucide-react";

export default function SourceCitationPanel({ sources = [], onInspectSource }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 overflow-hidden transition-all text-xs">
      {/* Header Bar Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Grounded Sources ({sources.length})</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Verified Context
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[11px] font-medium hidden xs:inline">
            {isExpanded ? "Hide Sources" : "View Sources"}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Sources Content */}
      {isExpanded && (
        <div className="p-4 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white/50 dark:bg-slate-950/40">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            The following exact vector passages from your knowledge base were retrieved to construct this answer:
          </p>

          <div className="space-y-2">
            {sources.map((src, idx) => {
              const relevancePercent = src.score ? `${Math.round(src.score * 100)}% Match` : null;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {src.title || src.fileName || `Document Source #${idx + 1}`}
                      </span>
                    </div>

                    {relevancePercent && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                        {relevancePercent}
                      </span>
                    )}
                  </div>

                  <blockquote className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 font-mono text-[11px] leading-relaxed border-l-2 border-indigo-500 line-clamp-3">
                    "{src.content}"
                  </blockquote>

                  {src.knowledgeId && onInspectSource && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onInspectSource(src.knowledgeId)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <span>View Source File</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
