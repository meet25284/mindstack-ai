"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X, Send, History, Trash2, Plus, Loader2, Menu, Upload, Settings, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { chat } from "@/services/chat";
import { useRouter } from "next/navigation";

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
      {
        id: makeId(),
        role: "assistant",
        content: `Hi! How can I help you today?`,
        ts: now,
      },
    ],
  };
}



export default function ChatPage() {
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

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  useEffect(() => {
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadThreads = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with your actual getThreads API call
      // const threads = await getThreads();
      const threads = [];

      if (threads && threads.length > 0) {
        const formattedThreads = threads.map(t => ({
          id: t._id,
          title: t.title,
          createdAt: new Date(t.createdAt).getTime(),
          updatedAt: new Date(t.updatedAt).getTime(),
          messages: [] // load messages when selected
        }));
        setConversations(formattedThreads);
        setActiveConversationId(formattedThreads[0].id);
        loadMessages(formattedThreads[0].id);
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
      const msgs = await getThreadMessages(threadId);
      const formattedMsgs = msgs.map(m => ({
        id: m._id,
        role: m.sender === "ai" ? "assistant" : "user",
        content: m.message,
        ts: new Date(m.createdAt).getTime()
      }));
      console.log("🚀 ~ loadMessages ~ formattedMsgs:", formattedMsgs)
      setConversations(prev => prev.map(c =>
        c.id === threadId ? { ...c, messages: formattedMsgs } : c
      ));
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  useEffect(() => {
    if (activeConversationId && activeConversationId !== "new") {
      const conv = conversations.find(c => c.id === activeConversationId);
      if (conv && conv.messages.length === 0) {
        loadMessages(activeConversationId);
      }
    }
  }, [activeConversationId]);

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
    setConversations((prev) => [conv, ...prev.filter(c => c.id !== "new")]);
    setActiveConversationId(conv.id);
    setDraft("");
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const deleteConversation = async (id) => {
    if (id !== "new") {
      try {
        await deleteThreadApi(id);
      } catch (err) {
        console.error("Failed to delete thread", err);
      }
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setTimeout(() => {
      setConversations((prev) => {
        if (prev.length > 0) return prev;
        return [newConversation()];
      });
    }, 0);
    if (activeConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        setActiveConversationId("new");
      }
    }
  };

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
            ...c, messages: c.messages.map((m) => m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m)
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
              prev.map((c) =>
                c.id === optimisticConv.id ? { ...c, id: newThreadId } : c
              )
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
    window.location.href = "/upload"; // Or use router.push if router is initialized
  };

  // TODO: Add API integration for fetching user info/settings
  const openSettings = () => {
    console.log("Settings clicked - Implement settings modal here");
  };


  return (
    <IsAuthenticated>
      <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">

        {/* Sidebar */}
        <div
          className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } transform fixed md:relative z-20 w-72 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out flex flex-col`}
        >
          <div className="p-4 flex items-center justify-between border-b border-gray-100">
            <button
              onClick={createNewChat}
              className="flex items-center gap-2 flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              <span>New Chat</span>
            </button>
            <button
              className="md:hidden ml-2 p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2 mt-2">
              History
            </div>
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setActiveConversationId(c.id);
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                }}
                className={`group flex items-center justify-between px-3 py-3 rounded-lg cursor-pointer transition-colors ${c.id === activeConversationId
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-100 text-gray-700"
                  }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className={c.id === activeConversationId ? "text-blue-600" : "text-gray-400"} />
                  <div className="truncate text-sm font-medium">{c.title || "New Chat"}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className={`p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all ${c.id === activeConversationId ? "opacity-100" : ""
                    }`}
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100">
            <button
              onClick={openSettings}
              className="flex items-center gap-3 px-3 py-2 w-full text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings size={18} className="text-gray-500" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="font-semibold text-gray-800 truncate px-4">
              {activeConversation?.title || "MindStack AI"}
            </div>
            <div className="w-8"></div> {/* Spacer for centering */}
          </div>

          {/* Chat Area */}
          <div
            className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center"
            ref={messagesContainerRef}
          >
            <div className="w-full max-w-3xl space-y-6 pb-20">
              {isLoading ? (
                <div className="flex justify-center items-center h-full text-gray-400">
                  <Loader2 className="animate-spin mr-2" size={24} /> Loading chats...
                </div>
              ) : (
                activeConversation?.messages.map((m) => {
                  return <div
                    key={m.id}
                    className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white text-xs font-bold">AI</span>
                      </div>
                    )}
                    <div
                      className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-[15px] leading-relaxed shadow-sm ${m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm"
                        }`}
                    >
                      <Streamdown
                        animated={{
                          animation: "fadeIn",
                          duration: 300,
                          easing: "ease-out",
                          sep: "word",
                        }}
                        isAnimating={true}
                      >
                        {m.content}
                      </Streamdown>
                    </div>
                  </div>;
                })
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 md:pb-8 px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-end gap-2 bg-white rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.05)] border border-gray-200 p-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                <button
                  onClick={handleFileUpload}
                  className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
                  title="Upload Knowledge Base File"
                >
                  <Upload size={20} />
                </button>

                <textarea
                  ref={inputRef}
                  className="w-full max-h-32 bg-transparent border-0 focus:ring-0 resize-none py-3 px-2 text-gray-700 text-[15px] placeholder-gray-400"
                  placeholder="Message MindStack AI..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  disabled={isSending || isLoading}
                  style={{ minHeight: '48px' }}
                />

                <button
                  onClick={sendMessage}
                  disabled={isSending || isLoading || !draft.trim()}
                  className={`p-2.5 rounded-xl shrink-0 transition-all ${draft.trim()
                    ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg"
                    : "bg-gray-100 text-gray-400"
                    }`}
                >
                  {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
              <div className="text-center text-xs text-gray-400 mt-3">
                MindStack AI can make mistakes. Consider verifying important information.
              </div>
            </div>
          </div>
        </div>
      </div>
    </IsAuthenticated>
  );
}
