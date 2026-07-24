"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  X,
  Send,
  History,
  Trash2,
  Plus,
  Loader2,
  Menu,
  Upload,
  Database,
  ShieldCheck,
  BookOpen,
  Copy,
  Check,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { chat } from "@/services/chat";
import ThemeToggle from "@/components/ThemeToggle";
import KBScopeIndicator from "@/components/KBScopeIndicator";
import SourceCitationPanel from "@/components/SourceCitationPanel";
import GroundedEmptyState from "@/components/GroundedEmptyState";
import FileViewerModal from "@/components/FileViewerModal";

/* ─── Auth Guard ─────────────────────────────────────────────────── */
function IsAuthenticated({ children }) {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsAuth(true);
    }
  }, [router]);

  if (!isAuth) return null;
  return <>{children}</>;
}

/* ─── Helper Functions ────────────────────────────────────────────── */
function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function newConversation() {
  const now = Date.now();
  return {
    id: "new",
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("new");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Inspector modal state
  const [inspectDoc, setInspectDoc] = useState(null);

  const activeConversation = useMemo(() => {
    const fromId = conversations.find((c) => c.id === activeConversationId);
    return fromId ?? conversations[0] ?? null;
  }, [activeConversationId, conversations]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* Auto-scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  /* Auto-focus input */
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending, activeConversationId]);

  /* Load threads on mount */
  useEffect(() => {
    loadThreads();
  }, []);

  /* Load threads from backend API */
  const loadThreads = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/threads", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const formatted = data.map((t) => ({
          id: t._id,
          title: t.title,
          createdAt: new Date(t.createdAt).getTime(),
          updatedAt: new Date(t.updatedAt).getTime(),
          messages: [],
        }));
        setConversations(formatted);
        setActiveConversationId(formatted[0].id);
        loadMessages(formatted[0].id);
      } else {
        const conv = newConversation();
        setConversations([conv]);
        setActiveConversationId(conv.id);
      }
    } catch (err) {
      console.error("Error loading threads:", err);
      const conv = newConversation();
      setConversations([conv]);
      setActiveConversationId(conv.id);
    } finally {
      setIsLoading(false);
    }
  };

  /* Load thread messages */
  const loadMessages = async (threadId) => {
    if (threadId === "new") return;
    try {
      const res = await fetch(`/api/thread/${threadId}/messages`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const msgs = await res.json();
      const formatted = msgs.map((m) => ({
        id: m._id,
        role: m.sender === "ai" ? "assistant" : "user",
        content: m.message,
        sources: m.sources || [],
        ts: new Date(m.createdAt).getTime(),
      }));
      setConversations((prev) =>
        prev.map((c) => (c.id === threadId ? { ...c, messages: formatted } : c))
      );
    } catch (err) {
      console.error("Error loading thread messages:", err);
    }
  };

  useEffect(() => {
    if (activeConversationId && activeConversationId !== "new") {
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv && conv.messages.length === 0) loadMessages(activeConversationId);
    }
  }, [activeConversationId]);

  /* State Management Helpers */
  const upsertConversation = (conv) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conv.id);
      if (idx === -1) return [conv, ...prev];
      const next = [...prev];
      next[idx] = conv;
      return next;
    });
  };

  const createNewChat = () => {
    const conv = newConversation();
    setConversations((prev) => [conv, ...prev.filter((c) => c.id !== "new")]);
    setActiveConversationId(conv.id);
    setDraft("");
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteConversation = async (id) => {
    if (id !== "new") {
      try {
        await fetch(`/api/deleteConversation/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
      } catch (err) {
        console.error("Failed to delete thread", err);
      }
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setTimeout(() => {
      setConversations((prev) => (prev.length > 0 ? prev : [newConversation()]));
    }, 0);
    if (activeConversationId === id) {
      const remaining = conversations.filter((c) => c.id !== id);
      setActiveConversationId(remaining.length > 0 ? remaining[0].id : "new");
    }
  };

  /* Send Message Workflow */
  const sendMessage = async (customPrompt) => {
    const text = (customPrompt || draft).trim();
    if (!text || isSending || !activeConversation) return;

    setIsSending(true);
    if (!customPrompt) setDraft("");

    const now = Date.now();
    const userMsg = { id: makeId(), role: "user", content: text, ts: now };
    const assistantMsgId = makeId();
    const assistantMsg = { id: assistantMsgId, role: "assistant", content: "", sources: [], ts: now };

    const optimisticConv = {
      ...activeConversation,
      title: activeConversation.title === "New Chat" ? text : activeConversation.title,
      updatedAt: now,
      messages: [...activeConversation.messages, userMsg, assistantMsg],
    };
    upsertConversation(optimisticConv);

    const updateAssistantMsg = (fn) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== optimisticConv.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) => (m.id === assistantMsgId ? fn(m) : m)),
          };
        })
      );
    };

    await chat(
      { prompt: text, threadId: activeConversation.id },
      {
        onSources: (retrievedSources) => {
          updateAssistantMsg((m) => ({ ...m, sources: retrievedSources }));
        },
        onChunk: (chunk) => {
          updateAssistantMsg((m) => ({ ...m, content: m.content + chunk }));
        },
        onDone: ({ threadId: newThreadId, title, sources: finalSources }) => {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== optimisticConv.id) return c;
              return {
                ...c,
                id: newThreadId || c.id,
                title: title || c.title,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, sources: finalSources || m.sources }
                    : m
                ),
              };
            })
          );
          if (newThreadId) setActiveConversationId(newThreadId);
          setIsSending(false);
        },
        onError: (err) => {
          updateAssistantMsg((m) => ({
            ...m,
            content: `\n⚠️ Grounding Error: ${err.message || "Failed to retrieve context from knowledge base."}`,
          }));
          setIsSending(false);
        },
      }
    );
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInspectSourceId = (id) => {
    if (!id) return;
    setInspectDoc({ id, fileType: "pdf", title: `Source Document #${id.slice(-6)}` });
  };

  const isNewChat = !activeConversation || activeConversation.messages.length === 0;

  return (
    <IsAuthenticated>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR NAVIGATION ── */}
        <aside
          className={`fixed top-0 left-0 z-30 h-full flex flex-col bg-slate-100/90 dark:bg-[#0b1120]/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 shadow-2xl md:shadow-none transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-72" : "w-0"
          } md:relative md:z-10`}
          style={{ overflow: "hidden" }}
        >
          <div className="flex flex-col h-full w-72">
            {/* Sidebar Brand & New Chat */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <Link href="/chat" className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20 shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block truncate">
                    MindStack AI
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    Knowledge Base Assistant
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors md:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* New Chat Action Button */}
            <div className="p-3">
              <button
                onClick={createNewChat}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>
            </div>

            {/* Conversation History List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              <p className="flex items-center gap-1.5 px-2 mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                <History className="w-3 h-3" />
                <span>Recent Conversations</span>
              </p>

              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveConversationId(c.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 overflow-hidden text-xs font-semibold ${
                      isActive
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                    <span className="flex-1 truncate">{c.title || "New Chat"}</span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(c.id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Delete thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Sidebar Navigation Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5 bg-slate-100/50 dark:bg-[#090d16]/50">
              <Link
                href="/knowledge"
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 rounded-xl transition-all"
              >
                <FolderOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Knowledge Base</span>
              </Link>
              <Link
                href="/upload"
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 rounded-xl transition-all"
              >
                <Upload className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Upload Documents</span>
              </Link>
              <div className="pt-2 flex items-center justify-between px-2">
                <span className="text-[11px] text-slate-400 font-medium">Appearance</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CHAT COLUMN ── */}
        <div className="relative flex flex-1 flex-col min-w-0 h-full z-10">
          {/* Top Header Bar */}
          <header className="flex shrink-0 items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsSidebarOpen((v) => !v)}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {activeConversation?.title || "MindStack AI Grounded Chat"}
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden xs:block">
                  Verified answers synthesized exclusively from uploaded knowledge
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <KBScopeIndicator activeScope="Global Knowledge" />
            </div>
          </header>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col items-center">
            <div className="w-full max-w-3xl space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="text-sm font-medium">Syncing Knowledge Base...</span>
                </div>
              ) : isNewChat ? (
                <GroundedEmptyState
                  type="onboarding"
                  onSampleClick={(q) => sendMessage(q)}
                />
              ) : (
                activeConversation?.messages.map((m, index) => {
                  const isUser = m.role === "user";
                  const isNoAnswer =
                    !isUser &&
                    (m.content?.includes("couldn't find this information") ||
                      m.content?.includes("Out of Knowledge Base Scope"));

                  return (
                    <div
                      key={m.id || index}
                      className={`flex items-start gap-3 animate-fade-in-up ${
                        isUser ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      {/* Avatar */}
                      {!isUser && (
                        <div className="w-9 h-9 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 mt-1">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                      )}

                      {/* Message Content Container */}
                      <div className={`space-y-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                        {/* Prompt Bubble / Answer Document Card */}
                        <div
                          className={`p-4 sm:p-5 rounded-3xl text-sm leading-relaxed transition-all shadow-sm ${
                            isUser
                              ? "bg-indigo-600 text-white font-medium rounded-tr-sm shadow-indigo-600/20"
                              : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-tl-sm"
                          }`}
                        >
                          {/* AI Grounded Header */}
                          {!isUser && (
                            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Verified Knowledge Response</span>
                              </div>

                              <button
                                onClick={() => handleCopyText(m.content, m.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                title="Copy response text"
                              >
                                {copiedId === m.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}

                          {/* Fallback check */}
                          {isNoAnswer ? (
                            <GroundedEmptyState type="no_answer" />
                          ) : (
                            <Streamdown
                              animated={{ animation: "fadeIn", duration: 250, easing: "ease-out" }}
                              isAnimating={true}
                            >
                              {m.content || "Searching knowledge vector index..."}
                            </Streamdown>
                          )}
                        </div>

                        {/* Grounded Citation Drawer */}
                        {!isUser && m.sources && m.sources.length > 0 && (
                          <SourceCitationPanel
                            sources={m.sources}
                            onInspectSource={(id) => handleInspectSourceId(id)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Static Bottom Query Input Bar */}
          <div className="shrink-0 px-4 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-md">
            <div className="max-w-3xl mx-auto space-y-2">
              <div className="relative group">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-500 blur-sm opacity-0 group-focus-within:opacity-100 transition duration-300 pointer-events-none" />

                <div className="relative flex items-end gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl p-3 shadow-xl">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    disabled={isSending || isLoading}
                    placeholder="Ask a question strictly answered from your knowledge base..."
                    className="flex-1 bg-transparent border-0 focus:ring-0 resize-none text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 outline-none leading-relaxed min-h-[44px] max-h-[140px]"
                  />

                  <button
                    onClick={() => sendMessage()}
                    disabled={isSending || isLoading || !draft.trim()}
                    className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 shadow-md shadow-indigo-600/20 transition-all shrink-0"
                    title="Send query"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
                <span>Press Enter to send query</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Strict Vector Grounding Enabled
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Document Inspector Modal */}
      {inspectDoc && (
        <FileViewerModal
          isOpen={Boolean(inspectDoc)}
          onClose={() => setInspectDoc(null)}
          doc={inspectDoc}
        />
      )}
    </IsAuthenticated>
  );
}
