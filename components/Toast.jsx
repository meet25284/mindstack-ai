"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, X } from "lucide-react";

/**
 * Toast component.
 *
 * toast.type accepts:
 *   "success"  — green
 *   "error"    — red
 *   "warning"  — amber  ← new, used for low-balance notifications
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    // Warnings stay slightly longer so users have time to read the ₹ message
    const duration = toast.type === "warning" ? 6000 : 4000;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isWarning = toast.type === "warning";

  const containerCls = isSuccess
    ? "bg-emerald-900/90 text-emerald-100 border-emerald-700/50 shadow-emerald-900/20"
    : isWarning
    ? "bg-amber-900/90 text-amber-100 border-amber-600/50 shadow-amber-900/20"
    : "bg-rose-900/90 text-rose-100 border-rose-700/50 shadow-rose-900/20";

  const Icon = isSuccess
    ? CheckCircle2
    : isWarning
    ? AlertTriangle
    : AlertCircle;

  const iconCls = isSuccess
    ? "text-emerald-400"
    : isWarning
    ? "text-amber-400"
    : "text-rose-400";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-md w-full px-4">
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 ${containerCls}`}
      >
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconCls}`} />
        <div className="flex-1 text-sm font-medium pr-2">
          {toast.message}
        </div>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
