"use client";

import { useEffect } from "react";
import {
  X,
  Zap,
  RefreshCw,
  AlertTriangle,
  Layers,
  Cpu,
  FileText,
  Clock,
  Sparkles,
  BarChart2,
} from "lucide-react";

/**
 * Formats ISO date into human-readable date & time string.
 */
function formatDateTime(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch (e) {
    return dateStr;
  }
}

/**
 * UsageHistoryDropdown Modal / Popover Component
 */
export default function UsageHistoryDropdown({
  isOpen,
  onClose,
  records = [],
  summary = null,
  isLoading = false,
  error = null,
  onRefresh = () => {},
  conversationTitle = "",
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 transition-all transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Usage History
                {conversationTitle && (
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate max-w-[200px] hidden sm:inline-block">
                    • {conversationTitle}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Detailed token consumption records for current conversation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Refresh Usage"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conversation Token Summary Cards */}
        {summary && summary.recordCount > 0 && (
          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-100/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
            {/* Total Usage Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Total Tokens</span>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {summary.totalUsage.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Across all responses</div>
            </div>

            {/* Response Tokens Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Response Tokens</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {summary.responseGenerationToken.total.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                P: {summary.responseGenerationToken.prompt.toLocaleString()} | O: {summary.responseGenerationToken.output.toLocaleString()}
              </div>
            </div>

            {/* Title Tokens Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Title Tokens</span>
                <FileText className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {summary.titleGenerationToken.total.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                P: {summary.titleGenerationToken.prompt.toLocaleString()} | O: {summary.titleGenerationToken.output.toLocaleString()}
              </div>
            </div>

            {/* Embedding Tokens Card */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                <span>Embedding Tokens</span>
                <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white">
                {summary.totalEmbeddingToken.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">RAG vector embeddings</div>
            </div>
          </div>
        )}

        {/* Modal Body / Table / State Views */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Fetching token usage records...
              </span>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center p-8 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center">
              <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200 mb-1">
                Failed to Load Usage
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 max-w-sm mb-4">
                {error}
              </p>
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <BarChart2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No usage available
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                No token usage records found for this conversation yet. Send a message to generate token metrics.
              </p>
            </div>
          )}

          {/* Detailed Usage Table / Cards */}
          {!isLoading && !error && records.length > 0 && (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3 text-center">Embedding</th>
                      <th className="px-4 py-3 text-center">Title (P / O / Total)</th>
                      <th className="px-4 py-3 text-center">Response (P / O / Total)</th>
                      <th className="px-4 py-3 text-right">Total Tokens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {records.map((r) => (
                      <tr
                        key={r._id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Date & Time */}
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDateTime(r.createdAt)}</span>
                        </td>

                        {/* Embedding */}
                        <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                          {r.embeddingToken || 0}
                        </td>

                        {/* Title Tokens */}
                        <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                          <span className="text-slate-400">{r.titleGenerationToken?.prompt || 0}</span>
                          {" / "}
                          <span className="text-slate-400">{r.titleGenerationToken?.output || 0}</span>
                          {" / "}
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {r.titleGenerationToken?.total || 0}
                          </span>
                        </td>

                        {/* Response Tokens */}
                        <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                          <span className="text-slate-400">{r.responseGenerationToken?.prompt || 0}</span>
                          {" / "}
                          <span className="text-slate-400">{r.responseGenerationToken?.output || 0}</span>
                          {" / "}
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {r.responseGenerationToken?.total || 0}
                          </span>
                        </td>

                        {/* Total Tokens Used */}
                        <td className="px-4 py-3 text-right font-black font-mono text-amber-600 dark:text-amber-400 text-sm">
                          {(r.totalUsage || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {records.map((r) => (
                  <div
                    key={r._id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDateTime(r.createdAt)}</span>
                      </div>
                      <div className="font-black font-mono text-amber-600 dark:text-amber-400">
                        {(r.totalUsage || 0).toLocaleString()} Tokens
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="block text-slate-400 text-[10px]">Embedding</span>
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                          {r.embeddingToken || 0}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="block text-slate-400 text-[10px]">Title (P/O/T)</span>
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                          {r.titleGenerationToken?.prompt || 0}/{r.titleGenerationToken?.output || 0}/{r.titleGenerationToken?.total || 0}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="block text-slate-400 text-[10px]">Resp (P/O/T)</span>
                        <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
                          {r.responseGenerationToken?.prompt || 0}/{r.responseGenerationToken?.output || 0}/{r.responseGenerationToken?.total || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {records.length} record{records.length !== 1 ? "s" : ""} found
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
