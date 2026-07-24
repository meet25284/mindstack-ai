/**
 * Client service helper for Knowledge Base management APIs.
 */

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
};

export const knowledgeService = {
  /**
   * Fetch all knowledge base documents
   */
  async getDocuments() {
    const res = await fetch("/api/knowledge", {
      headers: getAuthHeaders(),
      cache: "no-store",
    });

    if (res.status === 401) {
      throw new Error("Unauthorized");
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to fetch documents");
    }

    return data.documents || [];
  },

  /**
   * Delete document by ID
   */
  async deleteDocument(id) {
    const res = await fetch(`/api/knowledge/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.status === 401) {
      throw new Error("Unauthorized");
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to delete knowledge document");
    }

    return data;
  },

  /**
   * Fetch document details & extracted content for viewer
   */
  async getDocumentContent(id) {
    const res = await fetch(`/api/knowledge/${id}`, {
      headers: getAuthHeaders(),
    });

    if (res.status === 401) {
      throw new Error("Unauthorized");
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to fetch document content");
    }

    return data;
  },

  /**
   * Get direct preview URL for file endpoint
   */
  getFilePreviewUrl(id) {
    return `/api/knowledge/${id}/file`;
  },
};
