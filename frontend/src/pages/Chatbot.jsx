import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

const defaultMessages = [
  { id: "assistant-1", role: "assistant", content: "Hi! 👋 I'm TrueTone AI. Ask me about skincare routines, ingredients, or product safety." },
];

const getResponse = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes("routine")) return "For your skin, cleanse gently, use serum, moisturize, and apply SPF daily.";
  if (lower.includes("ingredient") || lower.includes("avoid")) return "Avoid fragrance, SLS, and alcohol denat. Look for ceramides and hyaluronic acid.";
  return "I can help with your skincare questions. Ask me anything about routines, ingredients, or product safety.";
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(defaultMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMessage = { id: `user-${Date.now()}`, role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", content: getResponse(userMessage.content) }]);
      setTyping(false);
    }, 900);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:bg-emerald-700 transition"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">TrueTone AI</p>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-2 hover:bg-white/20">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-white text-slate-800 border border-slate-200"} rounded-2xl px-4 py-3 max-w-[75%]`}> 
                  {msg.content}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl px-4 py-3">
                  Typing...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 p-3 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                className="flex-1 h-12 rounded-2xl border border-slate-200 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Ask anything..."
              />
              <button
                onClick={sendMessage}
                className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
