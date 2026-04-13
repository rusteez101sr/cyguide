"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

type Intent = "policy" | "planning" | "tutor";

interface Message {
  role: "user" | "assistant";
  content: string;
  intent?: Intent;
  model?: string;
}

const INTENT_META: Record<Intent, { label: string; color: string }> = {
  policy: { label: "Policy", color: "bg-amber-100 text-amber-800" },
  planning: { label: "Planning", color: "bg-blue-100 text-blue-800" },
  tutor: { label: "Tutor", color: "bg-emerald-100 text-emerald-800" },
};

function modelShortName(model: string): string {
  if (model.includes("claude")) return "Claude";
  if (model.includes("gpt-4o")) return "GPT-4o";
  if (model.includes("gemini")) return "Gemini";
  return model.split("/").pop() ?? model;
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "What GPA do I need to stay in the engineering college?",
  "What classes should I take as a CS sophomore next semester?",
  "Can you explain Big O notation with examples?",
  "How does the late drop policy work at ISU?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? "Request failed");
      }

      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply,
          intent: data.intent,
          model: data.model,
        },
      ]);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white z-10 shrink-0">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm select-none"
          style={{ backgroundColor: "#C8102E" }}
        >
          Cy
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 leading-tight text-sm">
            CyGuide
          </h1>
          <p className="text-xs text-gray-500 leading-tight">
            Iowa State University AI Assistant
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            New chat
          </button>
        )}
      </header>

      {/* Message thread */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
          {messages.length === 0 ? (
            /* Empty / welcome state */
            <div className="flex flex-col items-center text-center gap-6 mt-16">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm select-none"
                style={{ backgroundColor: "#C8102E" }}
              >
                Cy
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  Hi, I&apos;m CyGuide
                </h2>
                <p className="text-gray-500 mt-1 text-sm max-w-sm">
                  Your AI assistant for ISU policies, academic planning, and
                  course tutoring.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50 transition-colors text-gray-700 leading-snug"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mt-0.5 select-none"
                    style={{ backgroundColor: "#C8102E" }}
                  >
                    Cy
                  </div>
                )}

                <div
                  className={`flex flex-col gap-1.5 max-w-[78%] ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-900 rounded-bl-sm"
                    }`}
                    style={
                      msg.role === "user"
                        ? { backgroundColor: "#C8102E" }
                        : undefined
                    }
                  >
                    {msg.content}
                  </div>

                  {msg.role === "assistant" && msg.intent && msg.model && (
                    <div className="flex items-center gap-1.5 px-1">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          INTENT_META[msg.intent].color
                        }`}
                      >
                        {INTENT_META[msg.intent].label}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {modelShortName(msg.model)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold mt-0.5 select-none"
                style={{ backgroundColor: "#C8102E" }}
              >
                Cy
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input bar */}
      <div className="border-t border-gray-100 bg-white px-4 py-4 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about ISU policies, courses, or course material…"
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:opacity-50 transition-colors placeholder:text-gray-400"
            style={{ minHeight: "48px", maxHeight: "160px" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#C8102E" }}
            aria-label="Send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          CyGuide may make mistakes. Verify important information with your ISU
          advisor.
        </p>
      </div>
    </div>
  );
}
