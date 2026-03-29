import { useState, useRef, useCallback, useEffect } from "react";
import { useChatStore } from "@/stores/useChatStore";

export function ChatBot() {
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  
  // Connect to our new backend store
  const { messages, isLoading, sendMessage, clearChat, activeChatId } = useChatStore();
  
  const [inputValue, setInputValue] = useState("");

  // Refs
  const containerRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use a placeholder userId for now until auth is fully integrated
  const userId = "00000000-0000-0000-0000-000000000000";

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.max(300, Math.min(newWidth, 800)));
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResizing);
    } else {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const content = inputValue.trim();
    setInputValue("");
    
    // Trigger the backend API call via our store
    await sendMessage(userId, content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <aside 
      ref={containerRef}
      style={{ width }}
      className="h-full bg-(--bg-panel) text-(--text-primary) relative border-l border-(--border-subtle) flex flex-col shrink-0"
    >
      {/* Resizer Handle */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-(--accent-primary)/50 z-10 transition-colors"
        onMouseDown={startResizing}
      />
      
      {/* Chatbot Header */}
      <div className="border-b border-(--border-subtle) px-4 shrink-0 flex items-center justify-between">
        <h1 className="text-xl font-bold p-4">
          <span className="bg-linear-to-r from-pink-500 via-purple-700 to-purple-500 bg-clip-text text-transparent">Girok</span> 
          <span className="bg-linear-to-r from-purple-700 to-pink-500 text-transparent bg-clip-text"> AI</span>
        </h1>
        {activeChatId && (
          <button 
            onClick={() => clearChat(activeChatId)} 
            className="text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors"
            title="Clear Chat"
          >
            Clear
          </button>
        )}
      </div>
      
      {/* Chatbot Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-(--text-muted) space-y-4 opacity-70">
            <div className="w-16 h-16 rounded-full bg-linear-to-tr from-pink-500/20 to-purple-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="max-w-[250px]">Start a conversation or ask me anything.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user" 
                    ? "bg-linear-to-br from-purple-600 to-pink-600 text-white rounded-br-sm shadow-md" 
                    : "bg-(--bg-canvas) border border-(--border-subtle) text-(--text-primary) rounded-bl-sm shadow-sm"
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {isLoading && !messages.some(m => m.content === "" && m.role === "assistant") && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-(--bg-canvas) border border-(--border-subtle) rounded-2xl rounded-bl-sm px-4 py-4 flex items-center space-x-1 shadow-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} className="h-1 shrink-0" />
      </div>
      
      {/* Chatbot Input */}
      <div className="p-4 border-t border-(--border-subtle) bg-(--bg-panel) shrink-0">
        <div className="relative flex items-end bg-(--bg-canvas) border border-(--border-subtle) rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-purple-500/50 focus-within:border-purple-500 transition-all">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Girok AI anything... (Shift+Enter for newline)"
            className="w-full max-h-[150px] min-h-[52px] p-4 pr-12 bg-transparent text-(--text-primary) placeholder-(--text-muted) resize-none outline-none text-sm"
            rows={1}
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-(--text-muted)">
            Girok AI can make mistakes. Consider verifying important information.
          </span>
        </div>
      </div>
    </aside>
  );
}