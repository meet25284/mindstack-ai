"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Database,
  UploadCloud,
  FileText,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useKnowledge } from "@/hooks/useKnowledge";
import KnowledgeCard from "@/components/KnowledgeCard";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/EmptyState";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import DeleteDialog from "@/components/DeleteDialog";
import FileViewerModal from "@/components/FileViewerModal";
import FileDetailsModal from "@/components/FileDetailsModal";
import Toast from "@/components/Toast";
import ThemeToggle from "@/components/ThemeToggle";
import { MessageSquare } from "lucide-react";

export default function KnowledgePage() {
  const {
    documents,
    filteredDocuments,
    paginatedDocuments,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    typeFilter,
    setTypeFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    removeDocument,
    refreshDocuments,
    toast,
    hideToast,
  } = useKnowledge();

  // Modal states
  const [selectedViewDoc, setSelectedViewDoc] = useState(null);
  const [selectedDetailsDoc, setSelectedDetailsDoc] = useState(null);
  const [selectedDeleteDoc, setSelectedDeleteDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats calculation
  const totalChunks = documents.reduce((acc, doc) => acc + (doc.chunkCount || 0), 0);
  const totalEmbeddings = documents.reduce((acc, doc) => acc + (doc.totalEmbeddings || doc.chunkCount || 0), 0);

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedDeleteDoc) return;
    setIsDeleting(true);
    try {
      await removeDocument(selectedDeleteDoc.id);
      setSelectedDeleteDoc(null);
    } catch (err) {
      console.error("Delete document error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white pb-16 transition-colors duration-200">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white font-bold text-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Knowledge Base
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  RAG Vector Index
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Manage uploaded documents, vector chunk embeddings, and grounding sources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Grounded Chat</span>
            </Link>

            <button
              onClick={refreshDocuments}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Refresh List"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <ThemeToggle />

            <Link
              href="/upload"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-105"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden xs:inline">Upload Document</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Documents</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-100 mt-1">{documents.length}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Vector Chunks</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">{totalChunks.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Embeddings</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{totalEmbeddings.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Search & Sorting Toolbar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          totalCount={filteredDocuments.length}
        />

        {/* Content Views */}
        {isLoading ? (
          <LoadingSkeleton count={6} />
        ) : error ? (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-3xl p-8 text-center max-w-lg mx-auto my-8 space-y-4">
            <p className="text-rose-400 font-semibold">{error}</p>
            <button
              onClick={refreshDocuments}
              className="px-4 py-2 bg-rose-900/60 hover:bg-rose-800 text-rose-100 rounded-xl text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            isFiltered={Boolean(searchQuery || typeFilter !== "all")}
            onResetFilters={() => {
              setSearchQuery("");
              setTypeFilter("all");
            }}
          />
        ) : (
          <>
            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedDocuments.map((doc) => (
                <KnowledgeCard
                  key={doc.id}
                  doc={doc}
                  onView={(d) => setSelectedViewDoc(d)}
                  onDetails={(d) => setSelectedDetailsDoc(d)}
                  onDelete={(d) => setSelectedDeleteDoc(d)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 text-sm">
                <p className="text-slate-400 text-xs sm:text-sm">
                  Showing <span className="font-semibold text-slate-200">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-slate-200">
                    {Math.min(currentPage * pageSize, filteredDocuments.length)}
                  </span>{" "}
                  of <span className="font-semibold text-slate-200">{filteredDocuments.length}</span> documents
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-9 h-9 rounded-xl font-medium text-xs transition-all ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white shadow-md shadow-blue-900/30 font-bold"
                              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals & Dialogs */}
      <FileViewerModal
        isOpen={Boolean(selectedViewDoc)}
        onClose={() => setSelectedViewDoc(null)}
        doc={selectedViewDoc}
      />

      <FileDetailsModal
        isOpen={Boolean(selectedDetailsDoc)}
        onClose={() => setSelectedDetailsDoc(null)}
        doc={selectedDetailsDoc}
      />

      <DeleteDialog
        isOpen={Boolean(selectedDeleteDoc)}
        onClose={() => setSelectedDeleteDoc(null)}
        onConfirm={handleDeleteConfirm}
        doc={selectedDeleteDoc}
        isDeleting={isDeleting}
      />

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
