"use client";

import Link from "next/link";
import { FolderOpen, UploadCloud, RefreshCw, FileSearch } from "lucide-react";

export default function EmptyState({ isFiltered, onResetFilters }) {
  if (isFiltered) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto my-12 shadow-xl backdrop-blur-md">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-5">
          <FileSearch className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-2">No matching documents</h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          We couldn&apos;t find any knowledge base files matching your search query or selected filter criteria.
        </p>
        <button
          onClick={onResetFilters}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors border border-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
          Clear Search & Filters
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto my-12 shadow-2xl backdrop-blur-md">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
        <FolderOpen className="w-10 h-10" />
      </div>
      <h3 className="text-2xl font-bold text-slate-100 mb-2">Your Knowledge Base is Empty</h3>
      <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
        Upload PDF, DOCX, TXT, or Markdown files to populate your RAG vector storage and empower MindStack AI with domain knowledge.
      </p>
      <Link
        href="/upload"
        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-900/30 transition-all hover:scale-105"
      >
        <UploadCloud className="w-5 h-5" />
        Upload First Document
      </Link>
    </div>
  );
}
