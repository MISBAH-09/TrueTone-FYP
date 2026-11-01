import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Loader2, Plus, Menu, X, Library, Check, Search } from "lucide-react";
import { askChatbot, getChatSessions, getChatSession } from "../services/chatbot";
import ReactMarkdown from "react-markdown";

const GREETING = "Hi! I'm TrueTone AI. Ask me about your skincare routine, ingredients, or product safety, and I'll answer based on your specific profile and recommendations!";

const greetingMessage = { id: "assistant-greeting", role: "assistant", text: GREETING };

const RagPanel = ({ rag }) => {
  if (!rag?.retrieved?.length) return null;
  return (
    <div className="mt-3 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-900">How this answer was generated</p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">RAG used</span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex gap-3">
          <User className="mt-0.5 h-4 w-4 text-slate-400" />
          <div>
            <p className="font-medium text-slate-800">Personal profile retrieved</p>
            <p className="text-slate-500">{rag.profile}</p>
          </div>
        </div>
        <Check className="h-4 w-4 text-emerald-500" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <Library className="mt-0.5 h-4 w-4 text-slate-400" />
          <div>
            <p className="font-medium text-slate-800">Knowledge base searched</p>
            <p className="text-slate-500">{rag.knowledge_base}</p>
          </div>
        </div>
        <Check className="h-4 w-4 text-emerald-500" />
      </div>
      <p className="mt-4 font-semibold text-slate-900">Retrieved information</p>
      <ul className="mt-2 space-y-3">
        {rag.retrieved.map((item) => (
          <li key={`${item.kind}-${item.name}`} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800">{item.name}</p>
              <p className="text-slate-500">{item.detail}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-emerald-600">Retrieved</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-start justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-slate-400" />
          <div>
            <p className="font-medium text-slate-800">LLM response generation</p>
            <p className="text-slate-500">{rag.model}</p>
          </div>
        </div>
        <Check className="h-4 w-4 text-emerald-500" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>Retrieval similarity scores</span>
        <span>0-1 scale</span>
      </div>
      <ul className="mt-2 space-y-2">
        {rag.retrieved.map((item) => (
          <li key={`score-${item.kind}-${item.name}`}>
            <div className="mb-1 flex justify-between text-slate-700">
              <span>{item.name}</span>
              <span>{Number(item.score).toFixed(2)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.round(Number(item.score) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Chatbot = () => {
  const [messages, setMessages] = useState([greetingMessage]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [chatQuery, setChatQuery] = useState("");
  const scrollRef = useRef(null);
  const searchRef = useRef(null);

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

  useEffect(() => {
    if (!historyOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [historyOpen]);

  const visibleSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(chatQuery.trim().toLowerCase())
  );

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
        rag: msg.rag,
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
        setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: response.data.reply, rag: response.data.rag }]);
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
    <div className="flex h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-[calc(100dvh-3rem)]">
      <aside
        id="chat-history"
        inert={!historyOpen}
        className={`h-full shrink-0 overflow-hidden bg-slate-50 transition-[width] duration-300 ease-in-out ${
          historyOpen ? "w-72 border-r border-slate-200" : "w-0"
        }`}
      >
        <div className="flex h-full w-72 flex-col">
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-sm font-bold text-slate-900">Your chats</p>
          <button
            type="button"
            onClick={() => setHistoryOpen(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-0 text-slate-700 hover:bg-slate-100"
            aria-label="Close chat history"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              value={chatQuery}
              onChange={(event) => setChatQuery(event.target.value)}
              placeholder="Search chats"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-0 pl-9 pr-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {sessions.length === 0 && (
            <p className="px-2 text-xs text-slate-500">Saved chats show up here.</p>
          )}
          {sessions.length > 0 && visibleSessions.length === 0 && (
            <p className="px-2 text-xs text-slate-500">No chats match that search.</p>
          )}
          {visibleSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => openSession(session.id)}
              className={`w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                sessionId === session.id
                  ? "bg-white font-semibold text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              {session.title}
            </button>
          ))}
        </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="z-10 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-0 text-white shadow-sm hover:bg-slate-800"
            aria-label="Toggle chat history"
            aria-expanded={historyOpen}
            aria-controls="chat-history"
          >
            <Menu className="h-5 w-5 text-white" strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">TrueTone AI</h2>
            <p className="truncate text-xs text-slate-500 sm:text-sm">Your chats are saved to your account</p>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 text-white" />
            New chat
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-6 sm:px-6">
          <div className="w-full space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex w-full gap-3 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 ${msg.role === "user" ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-600"}`}>
                    {msg.role === "user" ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div className={`min-w-0 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 ${
                    msg.role === "user"
                      ? "ml-auto max-w-[75%] rounded-tr-none bg-emerald-600 text-white shadow-sm"
                      : "w-full flex-1 prose prose-sm prose-emerald rounded-tl-none border border-slate-200 bg-white text-slate-800 shadow-sm"
                  }`}>
                    {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                  </div>
                </div>
                {msg.role === "assistant" && <RagPanel rag={msg.rag} />}
              </div>
            ))}

            {typing && (
              <div className="flex flex-row gap-3 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 sm:h-10 sm:w-10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                  <span className="text-sm font-medium text-slate-500">TrueTone AI is thinking...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              className="h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:h-14 sm:px-5"
              placeholder="Ask about your routine, ingredients, or alternative products..."
              disabled={typing}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || typing}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 p-0 text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:h-14 sm:w-14"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
