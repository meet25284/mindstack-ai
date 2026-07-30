"use client";

import { useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from "next/link";

const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'docx', 'md'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function UploadPage() {
    const router = useRouter();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        title: "",
        document: null,
    });

    const [touched, setTouched] = useState({
        title: false,
        document: false,
    });

    const [fieldErrors, setFieldErrors] = useState({
        title: '',
        document: '',
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const validateTitle = (val) => {
        const trimmed = val ? val.trim() : '';
        if (!trimmed) return 'Document title is required';
        if (trimmed.length < 2) return 'Title must be at least 2 characters';
        if (trimmed.length > 100) return 'Title must be under 100 characters';
        return '';
    };

    const validateFile = (file) => {
        if (!file) return 'Document file is required';

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
            return `Unsupported file format (.${ext}). Allowed: PDF, TXT, DOCX, MD.`;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
            return `File size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB.`;
        }

        return '';
    };

    const handleTitleChange = (e) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, title: value }));
        if (status.type) setStatus({ type: '', message: '' });

        if (touched.title) {
            setFieldErrors((prev) => ({ ...prev, title: validateTitle(value) }));
        }
    };

    const handleTitleBlur = () => {
        setTouched((prev) => ({ ...prev, title: true }));
        setFieldErrors((prev) => ({ ...prev, title: validateTitle(formData.title) }));
    };

    const handleFileSelect = (file) => {
        setTouched((prev) => ({ ...prev, document: true }));
        const fileErr = validateFile(file);
        setFieldErrors((prev) => ({ ...prev, document: fileErr }));

        if (!fileErr) {
            setFormData((prev) => ({ ...prev, document: file }));
        } else {
            setFormData((prev) => ({ ...prev, document: null }));
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        if (status.type) setStatus({ type: '', message: '' });
    };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'document' && files && files.length > 0) {
            handleFileSelect(files[0]);
        } else if (name === 'title') {
            handleTitleChange(e);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const titleErr = validateTitle(formData.title);
        const docErr = validateFile(formData.document);

        setFieldErrors({ title: titleErr, document: docErr });
        setTouched({ title: true, document: true });

        if (titleErr || docErr) {
            return;
        }

        setIsUploading(true);
        setStatus({ type: '', message: '' });

        const data = new FormData();
        data.append("title", formData.title.trim());
        data.append("document", formData.document);

        try {
            const response = await fetch("/api/upload", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
                body: data,
            });

            if (response.status === 401) {
                router.push("/login");
                return;
            }

            const result = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: 'File uploaded successfully!' });
                setFormData({ title: "", document: null });
                setTouched({ title: false, document: false });
                setFieldErrors({ title: '', document: '' });
                if (fileInputRef.current) fileInputRef.current.value = "";

                setTimeout(() => {
                    router.push("/chat");
                }, 1500);
            } else {
                setStatus({ type: 'error', message: result.message || 'Upload failed.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'An unexpected error occurred.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100">
            <Link
                href="/chat"
                className="absolute top-8 left-8 z-50 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Chat
            </Link>
            {/* Background Ambient Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

            <div className="w-full max-w-md bg-slate-900/50 border border-slate-800/80 backdrop-blur-2xl rounded-3xl shadow-2xl transition-all duration-500 hover:border-slate-700 hover:shadow-indigo-500/10 relative z-10 overflow-hidden">
                <div className="p-8 sm:p-10">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/30">
                            <UploadCloud className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2 bg-[length:200%_auto] animate-gradient">
                            Upload Knowledge Base
                        </h2>
                        <p className="text-slate-400 text-sm font-medium tracking-wide">
                            Upload documents to enrich MindStack AI's knowledge base. Supported formats: PDF, TXT, DOCX, MD (Max 10MB).
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        {/* Title Input */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-semibold text-slate-300 mb-1.5">
                                Document Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleTitleChange}
                                onBlur={handleTitleBlur}
                                placeholder="e.g. Q3 Financial Report"
                                className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 text-slate-200 placeholder-slate-500 bg-slate-900/50 text-sm focus:outline-none ${touched.title && fieldErrors.title
                                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/50'
                                        : 'border-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500'
                                    }`}
                            />
                            {touched.title && fieldErrors.title && (
                                <p className="mt-1.5 text-xs text-rose-400 font-medium pl-1 animate-fade-in">{fieldErrors.title}</p>
                            )}
                        </div>

                        {/* File Dropzone */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                                Document File
                            </label>
                            <div
                                className={`mt-1 flex justify-center px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${touched.document && fieldErrors.document
                                        ? 'border-rose-500/80 bg-rose-950/20'
                                        : isDragging
                                            ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10'
                                            : formData.document
                                                ? 'border-emerald-500/60 bg-emerald-950/20'
                                                : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={triggerFileInput}
                            >
                                <div className="space-y-2 text-center">
                                    {formData.document ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/10">
                                                <FileText className="h-6 w-6 text-emerald-400" />
                                            </div>
                                            <div className="text-sm font-semibold text-slate-100 truncate max-w-[200px]">
                                                {formData.document.name}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {(formData.document.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="mx-auto h-12 w-12 text-indigo-400/80 mb-1" />
                                            <div className="flex text-sm text-slate-300 justify-center">
                                                <span className="relative cursor-pointer bg-transparent rounded-md font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                                    <span>Upload a file</span>
                                                </span>
                                                <p className="pl-1 text-slate-400">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                PDF, DOCX, TXT, MD up to 10MB
                                            </p>
                                        </>
                                    )}
                                </div>
                                <input
                                    id="file-upload"
                                    name="document"
                                    type="file"
                                    ref={fileInputRef}
                                    className="sr-only"
                                    onChange={handleChange}
                                    accept=".pdf,.txt,.docx,.md"
                                />
                            </div>
                            {touched.document && fieldErrors.document && (
                                <p className="mt-1.5 text-xs text-rose-400 font-medium pl-1 animate-fade-in">{fieldErrors.document}</p>
                            )}
                        </div>

                        {/* Status Messages */}
                        {status.message && (
                            <div className={`p-3.5 rounded-xl flex items-center gap-2.5 text-sm animate-fade-in ${status.type === 'success'
                                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                                    : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                                }`}>
                                {status.type === 'success' ? <CheckCircle size={16} className="shrink-0 text-emerald-400" /> : <AlertCircle size={16} className="shrink-0 text-rose-400" />}
                                <span>{status.message}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isUploading || Boolean(fieldErrors.title || fieldErrors.document)}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-600/20 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                            {isUploading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                                    Uploading...
                                </>
                            ) : (
                                'Upload Document'
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}} />
        </div>
    );
}

