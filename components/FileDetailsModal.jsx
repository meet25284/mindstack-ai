"use client";

import { X, Info, HardDrive, Database, Layers, Calendar, FileText, CheckCircle2 } from "lucide-react";

export default function FileDetailsModal({ isOpen, onClose, doc }) {
  if (!isOpen || !doc) return null;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 p-6 sm:p-7"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-lg">Document Details</h3>
              <p className="text-xs text-slate-400">Metadata & Vector Embedding Statistics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details Grid */}
        <div className="space-y-4 text-sm">
          {/* Title & File Name */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/70 space-y-2">
            <div>
              <span className="text-xs text-slate-400 font-medium block mb-0.5">Title</span>
              <p className="font-semibold text-slate-100">{doc.title}</p>
            </div>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Original Filename</span>
              <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {doc.fileName}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>File Format</span>
              </div>
              <p className="font-bold text-slate-100 uppercase text-sm">{doc.fileType}</p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>File Size</span>
              </div>
              <p className="font-bold text-slate-100 text-sm">{formatBytes(doc.fileSize)}</p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Total Chunks</span>
              </div>
              <p className="font-bold text-slate-100 text-sm">{doc.chunkCount ?? 0} chunks</p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/70">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>Embeddings</span>
              </div>
              <p className="font-bold text-slate-100 text-sm">{doc.totalEmbeddings ?? doc.chunkCount ?? 0}</p>
            </div>
          </div>

          {/* Timestamps & Identifiers */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/70 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Uploaded On
              </span>
              <span className="text-slate-200 font-medium">{formatDate(doc.uploadDate)}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">Document ID</span>
              <code className="text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                {doc.id}
              </code>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
              <span className="text-slate-400">Vector Index Status</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Indexed & Ready
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
