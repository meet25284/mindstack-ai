"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X, Send, History, Trash2, Plus, Loader2, Menu, Upload, Settings } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { chat } from "@/services/chat";
import { useRouter } from "next/navigation";

/* ─── Auth guard ─────────────────────────────────────────────────── */
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

/* ─── Helpers ─────────────────────────────────────────────────────── */
function makeId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function newConversation() {
  const now = Date.now();
  return {
    id: "new",
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [
      { id: makeId(), role: "assistant", content: "Hi! How can I help you today?", ts: now },
    ],
  };
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState("new");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  /* Auto-focus textarea */
  useEffect(() => {
    if (!isSending) inputRef.current?.focus();
  }, [isSending, activeConversationId]);

  /* Load threads on mount */
  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── API helpers ── */
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
        ts: new Date(m.createdAt).getTime(),
      }));
      setConversations((prev) =>
        prev.map((c) => (c.id === threadId ? { ...c, messages: formatted } : c))
      );
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  useEffect(() => {
    if (activeConversationId && activeConversationId !== "new") {
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv && conv.messages.length === 0) loadMessages(activeConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId]);

  /* ── Conversation actions ── */
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
        const res = await fetch(`/api/deleteConversation/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        console.log(data);
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

  /* ── Send message ── */
  const sendMessage = async () => {
    if (!activeConversation || isSending) return;
    const text = draft.trim();
    if (!text) return;

    setIsSending(true);
    setDraft("");

    const now = Date.now();
    const userMsg = { id: makeId(), role: "user", content: text, ts: now };
    const assistantMsgId = makeId();
    const assistantMsg = { id: assistantMsgId, role: "assistant", content: "", ts: now };

    const optimisticConv = {
      ...activeConversation,
      title: activeConversation.title === "New chat" ? text : activeConversation.title,
      updatedAt: now,
      messages: [...activeConversation.messages, userMsg, assistantMsg],
    };
    upsertConversation(optimisticConv);

    const appendToAssistant = (chunk) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== optimisticConv.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
            ),
          };
        })
      );
    };

    await chat(
      { prompt: text, threadId: activeConversation.id },
      {
        onChunk: (chunk) => appendToAssistant(chunk),
        onDone: ({ threadId: newThreadId }) => {
          if (newThreadId && newThreadId !== activeConversation.id) {
            setConversations((prev) =>
              prev.map((c) => (c.id === optimisticConv.id ? { ...c, id: newThreadId } : c))
            );
            setActiveConversationId(newThreadId);
          }
          setIsSending(false);
        },
        onError: (err) => {
          appendToAssistant(`\n[Error: ${err.message || "stream failed"}]`);
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

  // TODO: Add API integration for file uploads
  const handleFileUpload = () => {
    router.push("/upload");
  };

  // TODO: Add API integration for fetching user info/settings
  const openSettings = () => {
    console.log("Settings clicked - Implement settings modal here");
  };

  const isNewChat =
    activeConversation?.messages.length === 1 &&
    activeConversation.messages[0].content === "Hi! How can I help you today?" &&
    activeConversation.title === "New chat";

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <IsAuthenticated>
      {/*
        ROOT: fills the full viewport, no overflow, nothing scrolls here.
        flex row → sidebar | main-column
      */}
      <div className="flex h-screen w-screen overflow-hidden bg-[#030712] text-gray-100 font-sans">

        {/* Ambient background glows — purely decorative, pointer-events disabled */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
          <div className="absolute -bottom-[20%] -right-[10%] h-[50%] w-[50%] rounded-full bg-purple-600/10 blur-[120px]" />
        </div>

        {/* ── Mobile overlay backdrop ── */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ════════════════════════════════
            SIDEBAR
            - mobile: fixed, slides in/out
            - desktop: part of flex row, slides in/out but stays in flow via w-0/w-72
        ════════════════════════════════ */}
        <aside
          className={`
            fixed top-0 left-0 z-30 h-full flex flex-col
            bg-gray-900/60 backdrop-blur-xl border-r border-gray-800/60 shadow-2xl
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? "w-72" : "w-0"}
            md:relative md:z-10 md:shadow-none
          `}
          style={{ overflow: "hidden" }}
        >
          {/* Inner wrapper keeps content at fixed 288px so it doesn't squish while animating */}
          <div className="flex flex-col h-full w-72">

            {/* Header row: New Chat + Close */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-800/50">
              <button
                onClick={createNewChat}
                className="group flex items-center gap-2 flex-1 min-w-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
              >
                <Plus size={16} className="shrink-0 group-hover:rotate-90 transition-transform duration-300" />
                <span>New Chat</span>
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors shrink-0"
                title="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              <p className="flex items-center gap-1.5 px-2 mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                <History size={11} />
                Recent Chats
              </p>

              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
                    c.id === activeConversationId
                      ? "bg-gray-800/70 text-white border border-gray-700/50"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border border-transparent"
                  }`}
                >
                  {/* Active indicator bar */}
                  {c.id === activeConversationId && (
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                  )}

                  <MessageSquare
                    size={14}
                    className={`shrink-0 ${c.id === activeConversationId ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-400"}`}
                  />
                  <span className="flex-1 truncate text-sm font-medium">{c.title || "New Chat"}</span>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                    className="shrink-0 p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete chat"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Sidebar footer — Upload KB + Settings */}
            <div className="p-3 border-t border-gray-800/50 space-y-1">
              <button
                onClick={handleFileUpload}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all"
              >
                <Upload size={16} className="text-gray-500" />
                <span>Upload Knowledge Base</span>
              </button>
              <button
                onClick={openSettings}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all"
              >
                <Settings size={16} className="text-gray-500" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ════════════════════════════════
            MAIN COLUMN
            flex-col: header | scrollable messages | static input
        ════════════════════════════════ */}
        <div className="relative flex flex-1 flex-col min-w-0 h-full z-10">

          {/* Top header bar — always visible, never scrolls */}
          <header className="flex shrink-0 items-center gap-3 px-4 py-3 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-md">
            <button
              onClick={() => setIsSidebarOpen((v) => !v)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors shrink-0"
              title="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <h1 className="flex-1 truncate text-sm font-semibold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {activeConversation?.title || "MindStack AI"}
            </h1>
            <button
              onClick={createNewChat}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors shrink-0"
              title="New chat"
            >
              <Plus size={20} />
            </button>
          </header>

          {/* Messages — ONLY this area scrolls */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col items-center scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
            <div className="w-full max-w-3xl space-y-5">

              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
                  <div className="w-9 h-9 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                  <span className="text-sm animate-pulse">Syncing Knowledge...</span>
                </div>

              ) : isNewChat ? (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up" style={{marginTop:"200px"}}>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-5 shadow-xl shadow-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent mb-2">
                    Welcome to MindStack AI
                  </h2>
                  <p className="text-gray-500 max-w-sm text-sm leading-relaxed">
                    Ask questions, analyze your knowledge base, or explore ideas.
                  </p>
                </div>

              ) : (
                activeConversation?.messages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      className={`flex items-start gap-3 animate-fade-in-up ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 mt-0.5">
                          <span className="text-white text-[10px] font-bold tracking-wider">AI</span>
                        </div>
                      )}
                      <div
                        className={`px-4 py-3 rounded-2xl max-w-[80%] text-[15px] leading-relaxed ${
                          isUser
                            ? "bg-gray-800 text-gray-100 rounded-tr-sm border border-gray-700/50"
                            : "bg-gray-900/60 text-gray-300 border border-gray-800 rounded-tl-sm"
                        }`}
                      >
                        <Streamdown
                          animated={{ animation: "fadeIn", duration: 300, easing: "ease-out", sep: "word" }}
                          isAnimating={true}
                        >
                          {m.content}
                        </Streamdown>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input bar — static, never scrolls, always at bottom */}
          <div className="shrink-0 px-4 md:px-8 py-4 border-t border-gray-800/40 bg-gray-950/60 backdrop-blur-md" style={{display:"flex",justifyContent:"center"}}>
            <div className="max-w-3xl mx-auto">
              {/* Glow ring on focus */}
              <div className="relative group">
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500/40 to-purple-500/40 blur-sm opacity-0 group-focus-within:opacity-100 transition duration-500 pointer-events-none" />

                {/* Single inline row: textarea + send button */}
                <div className="relative flex items-center gap-2 bg-gray-900/80 border border-gray-800 rounded-2xl px-4 py-2 shadow-xl" style={{width:"100vh"}}>
                  <textarea
                    ref={inputRef}
                    className="flex-1 bg-transparent border-0 focus:ring-0 resize-none text-gray-200 text-[15px] placeholder-gray-500 leading-relaxed outline-none scrollbar-thin scrollbar-thumb-gray-700"
                    placeholder="Ask MindStack AI anything…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    disabled={isSending || isLoading}
                    style={{ minHeight: "40px", maxHeight: "160px" }}
                    autoFocus
                  />

                  <button
                    onClick={sendMessage}
                    disabled={isSending || isLoading || !draft.trim()}
                    className={`shrink-0 p-2.5 rounded-xl transition-all duration-200 ${
                      draft.trim() && !isSending
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30"
                        : "bg-gray-800/60 text-gray-500 cursor-not-allowed"
                    }`}
                    title="Send"
                  >
                    {isSending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-gray-600 mt-2">
                MindStack AI can make mistakes. Consider verifying important information.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
        `,
      }} />
    </IsAuthenticated>
  );
}
