import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Sparkles, User, Loader2 } from "lucide-react";
import { askChatbot } from "../services/chatbot";
import ReactMarkdown from "react-markdown";

const defaultMessages = [
  { id: "assistant-1", role: "assistant", text: "Hi! I'm TrueTone AI. Ask me about your skincare routine, ingredients, or product safety, and I'll answer based on your specific profile and recommendations!" },
];

const Chatbot = () => {
  const [messages, setMessages] = useState(defaultMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { id: `user-${Date.now()}`, role: "user", text: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setTyping(true);
    
    try {
      const response = await askChatbot(userMessage.text, newMessages.slice(0, -1));
      if (response.success) {
        setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: response.data.reply }]);
      } else {
        setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: "Sorry, I encountered an error: " + response.message }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", text: "Sorry, I couldn't reach the server right now. Please try again later." }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-slate-50 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl h-[80vh] bg-white border border-slate-200 rounded-3xl shadow-xl flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 bg-emerald-600 text-white shadow-sm z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">TrueTone AI</h2>
            <p className="text-sm font-medium text-emerald-100">Personalized Skincare Assistant</p>
          </div>
        </div>

        {/* Chat Area */}
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
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                )}
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

        {/* Input Area */}
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
  );
};

export default Chatbot;
