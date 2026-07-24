"use client";

import { ShieldCheck, Database, Layers } from "lucide-react";

export default function KBScopeIndicator({ totalChunks, activeScope = "All Collections" }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold backdrop-blur-sm select-none">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="truncate">Searching: <strong className="font-bold">{activeScope}</strong></span>
      {totalChunks !== undefined && (
        <>
          <span className="text-slate-400">•</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
            {totalChunks} Chunks Grounded
          </span>
        </>
      )}
    </div>
  );
}
