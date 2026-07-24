"use client";

export default function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 animate-pulse"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-11 h-11 bg-slate-800 rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-800 rounded-md w-3/4" />
                <div className="h-3 bg-slate-800/60 rounded-md w-1/2" />
              </div>
            </div>
            <div className="w-12 h-6 bg-slate-800 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
            <div className="h-4 bg-slate-800/80 rounded" />
            <div className="h-4 bg-slate-800/80 rounded" />
            <div className="h-3 bg-slate-800/50 rounded" />
            <div className="h-3 bg-slate-800/50 rounded" />
          </div>

          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
            <div className="w-16 h-5 bg-slate-800 rounded-full" />
            <div className="flex gap-2">
              <div className="w-16 h-8 bg-slate-800 rounded-xl" />
              <div className="w-8 h-8 bg-slate-800 rounded-xl" />
              <div className="w-8 h-8 bg-slate-800 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
