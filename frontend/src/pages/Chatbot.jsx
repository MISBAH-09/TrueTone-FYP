import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Loader2, Plus, MessagesSquare, X } from "lucide-react";
import { askChatbot, getChatSessions, getChatSession } from "../services/chatbot";
import ReactMarkdown from "react-markdown";

const GREETING = "Hi! I'm TrueTone AI. Ask me about your skincare routine, ingredients, or product safety, and I'll answer based on your specific profile and recommendations!";

const greetingMessage = { id: "assistant-greeting", role: "assistant", text: GREETING };

const Chatbot = () => {
  const [messages, setMessages] = useState([greetingMessage]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const scrollRef = useRef(null);

  const loadSessions = async () => {
    try {
      const data = await getChatSessions();
      setSessions(data.data || []);
    } catch (err) {
      console.error("Could not load chats", err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const startNewChat = () => {
    setSessionId(null);
    setMessages([greetingMessage]);
    setInput("");
  };

  const openSession = async (id) => {
    try {
      const data = await getChatSession(id);
      const saved = (data.data?.messages || []).map((msg) => ({
        id: msg.id,
        role: msg.role,
        text: msg.text,
      }));
      setSessionId(id);
      setMessages([greetingMessage, ...saved]);
    } catch (err) {
      console.error("Could not open chat", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || typing) return;

    const userMessage = { id: `user-${Date.now()}`, role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    try {
      const response = await askChatbot(userMessage.text, sessionId);
      if (response.success) {
        setSessionId(response.data.session_id);
        setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: response.data.reply }]);
        loadSessions();
      } else {
        setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: "Sorry, I encountered an error: " + response.message }]);
      }
    } catch (err) {
      const detail = err.response?.data?.message || "Sorry, I couldn't reach the server right now. Please try again later.";
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: detail }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-slate-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-5xl h-[80vh] bg-white border border-slate-200 rounded-3xl shadow-xl flex overflow-hidden animate-fadeIn">
        {historyOpen && (
          <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-bold text-slate-900">Your chats</p>
              <button type="button" onClick={() => setHistoryOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3">
              <button
                type="button"
                onClick={startNewChat}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" /> New chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {sessions.length === 0 && (
                <p className="px-2 text-xs text-slate-500">Saved chats show up here.</p>
              )}
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => openSession(session.id)}
                  className={`w-full truncate rounded-xl px-3 py-2 text-left text-sm ${
                    sessionId === session.id ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {session.title}
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-4 px-6 py-5 bg-emerald-600 text-white shadow-sm z-10">
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"
              aria-label="Toggle saved chats"
            >
              <MessagesSquare className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold">TrueTone AI</h2>
              <p className="text-sm font-medium text-emerald-100">Your chats are saved to your account</p>
            </div>
            <button type="button" onClick={startNewChat} className="rounded-xl bg-white/20 px-3 py-2 text-sm font-semibold">
              New
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-600"}`}>
                  {msg.role === "user" ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div className={`rounded-2xl px-5 py-4 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-tr-none shadow-sm"
                    : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm prose prose-sm prose-emerald"
                }`}>
                  {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-4 flex-row">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span className="text-sm text-slate-500 font-medium">TrueTone AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-4 bg-white">
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                className="flex-1 h-14 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-[15px] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-sm"
                placeholder="Ask about your routine, ingredients, or alternative products..."
                disabled={typing}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || typing}
                className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
