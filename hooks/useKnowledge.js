"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { knowledgeService } from "@/services/knowledgeService";

export function useKnowledge() {
  const router = useRouter();

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, name, chunks, size
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Fetch Documents
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await knowledgeService.getDocuments();
      setDocuments(data);
    } catch (err) {
      if (err.message === "Unauthorized") {
        router.push("/login");
        return;
      }
      setError(err.message || "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle Deletion - UI updates immediately without page refresh
  const removeDocument = useCallback(
    async (id) => {
      try {
        const targetDoc = documents.find((doc) => doc.id === id);
        const result = await knowledgeService.deleteDocument(id);

        // Instantly update UI state
        setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== id));

        const docTitle = targetDoc ? `"${targetDoc.title}"` : "Document";
        showToast(`✅ ${docTitle} deleted successfully. (${result.deletedChunks || 0} vector embeddings removed)`, "success");
        return result;
      } catch (err) {
        showToast(`❌ Delete failed: ${err.message}`, "error");
        throw err;
      }
    },
    [documents, showToast]
  );

  // Processed documents list (search, filter, sort)
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (doc) =>
          doc.title?.toLowerCase().includes(q) ||
          doc.fileName?.toLowerCase().includes(q) ||
          doc.fileType?.toLowerCase().includes(q) ||
          doc.id?.toLowerCase().includes(q)
      );
    }

    // 2. Type Filter
    if (typeFilter !== "all") {
      result = result.filter(
        (doc) => doc.fileType?.toLowerCase() === typeFilter.toLowerCase()
      );
    }

    // 3. Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt || b.uploadDate) - new Date(a.createdAt || a.uploadDate);
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || a.uploadDate) - new Date(b.createdAt || b.uploadDate);
      }
      if (sortBy === "name") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "chunks") {
        return (b.chunkCount || 0) - (a.chunkCount || 0);
      }
      if (sortBy === "size") {
        return (b.fileSize || 0) - (a.fileSize || 0);
      }
      return 0;
    });

    return result;
  }, [documents, searchQuery, sortBy, typeFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, typeFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, currentPage, pageSize]);

  return {
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
    setPageSize,
    removeDocument,
    refreshDocuments: fetchDocuments,
    toast,
    showToast,
    hideToast,
  };
}
