"use client";

import { AlertTriangle, Loader2, Check, Trash2 } from "lucide-react";

export default function DeleteDialog({ isOpen, onClose, onConfirm, doc, isDeleting }) {
    if (!isOpen || !doc) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-7 text-slate-100 transition-all transform scale-100"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-dialog-title"
            >
                {/* Header Icon */}
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
                    <AlertTriangle className="w-6 h-6" />
                </div>

                {/* Title & Description */}
                <h3 id="delete-dialog-title" className="text-xl font-bold text-slate-100 mb-2">
                    Delete "{doc.title || doc.fileName}"?
                </h3>

                <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                    Are you sure you want to delete this document from your Knowledge Base?
                </p>

                {/* Breakdown Card */}
                <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 mb-6 space-y-2 text-xs sm:text-sm text-slate-300">
                    <p className="font-semibold text-slate-400 mb-2">This action will remove:</p>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Uploaded file (<code className="text-slate-400 font-mono text-xs">{doc.fileName}</code>)</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>MongoDB document record</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>All {doc.chunkCount ?? 0} vector embeddings</span>
                    </div>
                    <p className="text-rose-400 font-medium pt-2 border-t border-slate-800/60 text-xs">
                        ⚠️ This action cannot be undone.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-medium text-sm transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-sm shadow-lg shadow-rose-900/30 flex items-center gap-2 transition-all disabled:opacity-60"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Delete Forever
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
