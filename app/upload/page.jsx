"use client";

import { useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Knowledge Base</h2>
                        <p className="text-sm text-gray-500">
                            Upload documents to enrich MindStack AI's knowledge base. Supported formats: PDF, TXT, DOCX, MD (Max 10MB).
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        {/* Title Input */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
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
                                className={`w-full px-4 py-3 rounded-xl border transition-all text-gray-800 placeholder-gray-400 focus:outline-none ${
                                    touched.title && fieldErrors.title
                                        ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                                        : 'border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                }`}
                            />
                            {touched.title && fieldErrors.title && (
                                <p className="mt-1 text-xs text-red-500 font-medium pl-1">{fieldErrors.title}</p>
                            )}
                        </div>

                        {/* File Dropzone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Document File
                            </label>
                            <div
                                className={`mt-1 flex justify-center px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                                    touched.document && fieldErrors.document
                                        ? 'border-red-400 bg-red-50'
                                        : isDragging
                                        ? 'border-blue-500 bg-blue-50'
                                        : formData.document
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={triggerFileInput}
                            >
                                <div className="space-y-2 text-center">
                                    {formData.document ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                                                <FileText className="h-6 w-6 text-green-600" />
                                            </div>
                                            <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                                {formData.document.name}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {(formData.document.size / (1024 * 1024)).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                    <span>Upload a file</span>
                                                </span>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">
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
                                <p className="mt-1 text-xs text-red-500 font-medium pl-1">{fieldErrors.document}</p>
                            )}
                        </div>

                        {/* Status Messages */}
                        {status.message && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                }`}>
                                {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                <span>{status.message}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isUploading || Boolean(fieldErrors.title || fieldErrors.document)}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    Uploading...
                                </>
                            ) : (
                                'Upload Document'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
