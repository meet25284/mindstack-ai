"use client";

import { Search, X, ArrowUpDown, Filter, SlidersHorizontal } from "lucide-react";

export default function SearchBar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  totalCount,
}) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md mb-8">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents by title, filename, ID, or format..."
            className="w-full pl-11 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* File Type Filter */}
          <div className="relative flex items-center">
            <Filter className="absolute left-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Formats</option>
              <option value="pdf">PDF Documents</option>
              <option value="docx">DOCX Documents</option>
              <option value="txt">TXT Plain Text</option>
              <option value="md">Markdown Files</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-medium text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="name">Sort: Title A-Z</option>
              <option value="chunks">Sort: Most Chunks</option>
              <option value="size">Sort: File Size</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
