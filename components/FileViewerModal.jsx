"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  FileText,
  Loader2,
  Eye,
  Code,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  FileCode,
  Download,
} from "lucide-react";
import { knowledgeService } from "@/services/knowledgeService";

export default function FileViewerModal({ isOpen, onClose, doc }) {
  const [content, setContent] = useState("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("preview"); // "preview" or "text"
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !doc) return;

    let createdUrl = null;
    const ext = doc.fileType?.toLowerCase();
    const isPdfFile = ext === "pdf";

    if (isPdfFile) {
      setActiveTab("preview");
    } else {
      setActiveTab("text");
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      setContent("");
      setPdfBlobUrl(null);

      try {
        // 1. Fetch text content
        const textRes = await knowledgeService.getDocumentContent(doc.id);
        setContent(textRes.content || "No extracted text available.");

        // 2. If PDF, fetch binary blob for native PDF iframe preview
        if (isPdfFile) {
          const token = localStorage.getItem("token") || "";
          const fileRes = await fetch(`/api/knowledge/${doc.id}/file`, {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });

          if (fileRes.ok) {
            const blob = await fileRes.blob();
            createdUrl = URL.createObjectURL(blob);
            setPdfBlobUrl(createdUrl);
          } else {
            // Fall back to text tab if PDF file binary missing
            setActiveTab("text");
          }
        }
      } catch (err) {
        console.error("Error loading document:", err);
        setError(err.message || "Failed to load document content.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const isPdf = doc.fileType?.toLowerCase() === "pdf";

  const handleCopyText = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        ref={containerRef}
        className={`w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300 ${isFullscreen ? "h-screen max-w-none rounded-none" : "max-w-6xl h-[90vh]"
          }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/90 gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              {isPdf ? <FileText className="w-5 h-5 text-rose-400" /> : <FileCode className="w-5 h-5 text-blue-400" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-100 truncate text-base sm:text-lg">
                {doc.title || doc.fileName}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 truncate">
                <span className="uppercase font-bold text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {doc.fileType || "DOC"}
                </span>
                <span className="truncate">{doc.fileName}</span>
                <span>•</span>
                <span>{doc.chunkCount ?? 0} chunks</span>
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Switcher Tabs */}
            <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 text-xs">
              {isPdf && pdfBlobUrl && (
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all ${activeTab === "preview"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                      : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>PDF Viewer</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab("text")}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all ${activeTab === "text"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                    : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Extracted Content</span>
              </button>
            </div>

            {/* Copy Button (for text mode) */}
            {activeTab === "text" && content && (
              <button
                onClick={handleCopyText}
                className="p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Copy Extracted Content"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors hidden sm:flex"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-9 h-9 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-slate-300">Loading document viewer...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <X className="w-6 h-6" />
              </div>
              <p className="text-sm text-rose-400 font-semibold">{error}</p>
            </div>
          ) : activeTab === "preview" && isPdf && pdfBlobUrl ? (
            <div className="flex-1 w-full h-full bg-slate-950 flex flex-col">
              <iframe
                src={`${pdfBlobUrl}#toolbar=1`}
                className="w-full h-full border-0"
                title={doc.title || doc.fileName}
              />
            </div>
          ) : (
            /* Extracted Text Content Container */
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 font-mono text-sm leading-relaxed text-slate-200 select-text selection:bg-blue-600 selection:text-white bg-slate-950">
              <div
                style={{ fontSize: `${(zoomLevel / 100) * 14}px` }}
                className="max-w-4xl mx-auto space-y-4 whitespace-pre-wrap"
              >
                {content || "No extracted text available for this file."}
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/90 text-xs text-slate-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span>Document ID: <code className="text-slate-300 font-mono text-[11px]">{doc.id}</code></span>
          </div>

          {activeTab === "text" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Zoom Out Font"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-slate-400 font-mono w-10 text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                title="Zoom In Font"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="text-slate-500 hidden xs:block">
            In-App Document Viewer
          </div>
        </div>
      </div>
    </div>
  );
}
