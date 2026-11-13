import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, Loader2, Plus, Menu, X, Library, Check, Search } from "lucide-react";
import { askChatbot, getChatSessions, getChatSession } from "../services/chatbot";
import ReactMarkdown from "react-markdown";

const GREETING =
  "Hi! I'm TrueTone AI. Ask me about your skincare routine, ingredients, or product safety, and I'll answer based on your specific profile and recommendations!";

const greetingMessage = { id: "assistant-greeting", role: "assistant", text: GREETING };

const RagPanel = ({ rag }) => {
  if (!rag?.retrieved?.length) return null;
  return (
    <div className="mt-3 w-full rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[var(--tt-ink)]">How this answer was generated</p>
        <span className="rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--tt-primary)]">
          RAG used
        </span>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3 border-t border-[var(--tt-border)] pt-3">
        <div className="flex gap-3">
          <User className="mt-0.5 h-4 w-4 text-[var(--tt-secondary)]" />
          <div>
            <p className="font-medium text-[var(--tt-ink)]">Personal profile retrieved</p>
            <p className="text-[var(--tt-secondary)]">{rag.profile}</p>
          </div>
        </div>
        <Check className="h-4 w-4 text-[var(--tt-safe)]" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <Library className="mt-0.5 h-4 w-4 text-[var(--tt-secondary)]" />
          <div>
            <p className="font-medium text-[var(--tt-ink)]">Knowledge base searched</p>
            <p className="text-[var(--tt-secondary)]">{rag.knowledge_base}</p>
          </div>
        </div>
        <Check className="h-4 w-4 text-[var(--tt-safe)]" />
      </div>
      <p className="mt-4 font-semibold text-[var(--tt-ink)]">Retrieved information</p>
      <ul className="mt-2 space-y-3">
        {rag.retrieved.map((item) => (
          <li key={`${item.kind}-${item.name}`} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--tt-ink)]">{item.name}</p>
              <p className="text-[var(--tt-secondary)]">{item.detail}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-[var(--tt-primary)]">Retrieved</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-start justify-between gap-3 border-t border-[var(--tt-border)] pt-3">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-[var(--tt-secondary)]" />
          <div>
            <p className="font-medium text-[var(--tt-ink)]">LLM response generation</p>
            <p className="text-[var(--tt-secondary)]">{rag.model}</p>
          </div>
        </div>
        <Check className="h-4 w-4 text-[var(--tt-safe)]" />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--tt-secondary)]">
        <span>Retrieval similarity scores</span>
        <span>0-1 scale</span>
      </div>
      <ul className="mt-2 space-y-2">
        {rag.retrieved.map((item) => (
          <li key={`score-${item.kind}-${item.name}`}>
            <div className="mb-1 flex justify-between text-[var(--tt-ink)]">
              <span>{item.name}</span>
              <span className="tt-mono text-xs">{Number(item.score).toFixed(2)}</span>
            </div>
            <div className="h-1.5 rounded-[var(--tt-radius)] bg-[var(--tt-paper)]">
              <div
                className="h-1.5 rounded-[var(--tt-radius)] bg-[var(--tt-primary)]"
                style={{ width: `${Math.round(Number(item.score) * 100)}%` }}
              />
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
  const [historyOpen, setHistoryOpen] = useState(false);
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
        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, role: "assistant", text: response.data.reply, rag: response.data.rag },
        ]);
        loadSessions();
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, role: "assistant", text: "Sorry, I encountered an error: " + response.message },
        ]);
      }
    } catch (err) {
      const detail =
        err.response?.data?.message ||
        "Sorry, I couldn't reach the server right now. Please try again later.";
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: detail }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-2rem)] w-full overflow-hidden rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-ink)] lg:h-[calc(100dvh-3rem)]">
      <aside
        id="chat-history"
        inert={!historyOpen}
        className={`h-full shrink-0 overflow-hidden bg-[var(--tt-paper)] transition-[width] duration-300 ease-in-out ${
          historyOpen ? "w-72 border-r border-[var(--tt-border)]" : "w-0"
        }`}
      >
        <div className="flex h-full w-72 flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <p className="text-sm font-semibold text-[var(--tt-ink)]">Your chats</p>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] p-0 text-[var(--tt-ink)] hover:bg-[var(--tt-paper)]"
              aria-label="Close chat history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 px-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tt-secondary)]" />
              <input
                ref={searchRef}
                value={chatQuery}
                onChange={(event) => setChatQuery(event.target.value)}
                placeholder="Search chats"
                className="h-10 w-full rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] py-0 pl-9 pr-3 text-sm text-[var(--tt-ink)] focus:border-[var(--tt-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tt-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={startNewChat}
              className="flex h-[var(--tt-control-h)] w-full items-center justify-center gap-2 rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-3 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)]"
            >
              <Plus className="h-4 w-4" /> New chat
            </button>
          </div>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {sessions.length === 0 && (
              <p className="px-2 text-xs text-[var(--tt-secondary)]">Saved chats show up here.</p>
            )}
            {sessions.length > 0 && visibleSessions.length === 0 && (
              <p className="px-2 text-xs text-[var(--tt-secondary)]">No chats match that search.</p>
            )}
            {visibleSessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => openSession(session.id)}
                className={`w-full truncate rounded-[var(--tt-radius)] px-3 py-2.5 text-left text-sm transition-colors ${
                  sessionId === session.id
                    ? "bg-[var(--tt-surface)] font-semibold text-[var(--tt-ink)] border border-[var(--tt-border)]"
                    : "text-[var(--tt-secondary)] hover:bg-[var(--tt-surface)] hover:text-[var(--tt-ink)]"
                }`}
              >
                {session.title}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="z-10 flex items-center gap-3 border-b border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 py-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-ink)] p-0 text-white hover:opacity-90"
            aria-label="Toggle chat history"
            aria-expanded={historyOpen}
            aria-controls="chat-history"
          >
            <Menu className="h-5 w-5 text-white" strokeWidth={2.5} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="tt-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--tt-primary)]">
              AI Chatbot
            </p>
            <h2 className="truncate text-base font-semibold text-[var(--tt-ink)] sm:text-lg">TrueTone AI</h2>
            <p className="truncate text-xs text-[var(--tt-secondary)] sm:text-sm">
              Your chats are saved to your account
            </p>
          </div>
          <button
            type="button"
            onClick={startNewChat}
            className="inline-flex h-[var(--tt-control-h)] shrink-0 items-center gap-2 rounded-[var(--tt-radius)] bg-[var(--tt-primary)] px-3 text-sm font-medium text-white hover:bg-[var(--tt-primary-hover)]"
          >
            <Plus className="h-4 w-4 text-white" />
            New chat
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--tt-paper)] px-4 py-4 sm:px-5">
          <div className="w-full space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex w-full gap-3 sm:gap-4 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tt-radius)] sm:h-10 sm:w-10 ${
                      msg.role === "user"
                        ? "bg-[var(--tt-border)] text-[var(--tt-secondary)]"
                        : "bg-[var(--tt-primary-muted)] text-[var(--tt-primary)]"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <div
                    className={`min-w-0 rounded-[var(--tt-radius)] px-4 py-3 sm:px-5 sm:py-4 ${
                      msg.role === "user"
                        ? "ml-auto max-w-[75%] bg-[var(--tt-primary)] text-white"
                        : "w-full flex-1 prose prose-sm border border-[var(--tt-border)] bg-[var(--tt-surface)] text-[var(--tt-ink)] prose-headings:text-[var(--tt-ink)] prose-a:text-[var(--tt-primary)]"
                    }`}
                  >
                    {msg.role === "user" ? msg.text : <ReactMarkdown>{msg.text}</ReactMarkdown>}
                  </div>
                </div>
                {msg.role === "assistant" && <RagPanel rag={msg.rag} />}
              </div>
            ))}

            {typing && (
              <div className="flex flex-row gap-3 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary-muted)] text-[var(--tt-primary)] sm:h-10 sm:w-10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--tt-primary)]" />
                  <span className="text-sm font-medium text-[var(--tt-secondary)]">
                    TrueTone AI is thinking...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--tt-border)] bg-[var(--tt-surface)] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              className="h-12 flex-1 rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] px-4 text-[15px] text-[var(--tt-ink)] transition focus:border-[var(--tt-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--tt-primary)] sm:h-14 sm:px-5"
              placeholder="Ask about your routine, ingredients, or alternative products..."
              disabled={typing}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || typing}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--tt-radius)] bg-[var(--tt-primary)] p-0 text-white transition hover:bg-[var(--tt-primary-hover)] disabled:opacity-50 sm:h-14 sm:w-14"
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
