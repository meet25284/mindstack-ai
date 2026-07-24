"use client";

import { Eye, Trash2, Info, FileText, Database, Layers, Calendar, HardDrive, CheckCircle2 } from "lucide-react";

export default function KnowledgeCard({ doc, onView, onDetails, onDelete }) {
  // Format bytes helper
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Relative time helper
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "recently";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays === 0) {
        if (diffHours === 0) {
          if (diffMins === 0) return "just now";
          return `${diffMins}m ago`;
        }
        return `${diffHours}h ago`;
      } else if (diffDays === 1) {
        return "yesterday";
      } else if (diffDays < 30) {
        return `${diffDays} days ago`;
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {
      return "recently";
    }
  };

  // Color theme by file extension
  const getFileTypeBadge = (typeStr) => {
    const t = (typeStr || "").toLowerCase();
    switch (t) {
      case "pdf":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          iconColor: "text-rose-400",
          label: "PDF",
        };
      case "docx":
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          iconColor: "text-blue-400",
          label: "DOCX",
        };
      case "md":
      case "markdown":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          iconColor: "text-emerald-400",
          label: "MD",
        };
      default:
        return {
          bg: "bg-slate-500/10 text-slate-300 border-slate-500/20",
          iconColor: "text-amber-400",
          label: (typeStr || "TXT").toUpperCase(),
        };
    }
  };

  const fileTheme = getFileTypeBadge(doc.fileType);

  return (
    <div className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col justify-between overflow-hidden">
      {/* Subtle background glow on hover */}
      <div className="absolute -right-12 -top-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-500 pointer-events-none" />

      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300 ${fileTheme.iconColor}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors truncate text-base" title={doc.title}>
                {doc.title}
              </h4>
              <p className="text-xs text-slate-400 font-mono truncate max-w-[180px] sm:max-w-[200px]" title={doc.fileName}>
                {doc.fileName}
              </p>
            </div>
          </div>

          <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold tracking-wide uppercase border shrink-0 ${fileTheme.bg}`}>
            {fileTheme.label}
          </span>
        </div>

        {/* Stats Grid Pill */}
        <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">{doc.chunkCount ?? 0} Chunks</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{doc.totalEmbeddings ?? doc.chunkCount ?? 0} Embeddings</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{formatBytes(doc.fileSize)}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{getRelativeTime(doc.uploadDate)}</span>
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-5 pt-4 border-t border-slate-800/70 flex items-center justify-between gap-2">
        {/* Status Badge & Short ID */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
          <span className="text-[11px] font-mono text-slate-500 truncate hidden xs:inline" title={doc.id}>
            #{doc.id?.slice(-6)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onView(doc)}
            className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="View File Content"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>

          <button
            onClick={() => onDetails(doc)}
            className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
            title="View Full Metadata Details"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(doc)}
            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 transition-all"
            title="Delete Document"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
