"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import MessageBubble from "@/components/MessageBubble";
import { api } from "@/lib/api";
import { extractSources, mergeStreamChunk } from "@/lib/stream-merge";
import { IconSend } from "@/components/ui-icons";

type ChatMode = "chat" | "deep_solve" | "quiz" | "research" | "guided";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  sources?: Array<{ title?: string; url?: string; snippet?: string }>;
}

const MODES: { id: ChatMode; label: string }[] = [
  { id: "chat", label: "对话" },
  { id: "deep_solve", label: "深度解题" },
  { id: "quiz", label: "测验" },
  { id: "research", label: "研究" },
  { id: "guided", label: "引导" },
];

let _mid = 0;
function genId() {
  return `c${Date.now().toString(36)}${(++_mid).toString(36)}`;
}

const QUICK_PROMPTS = [
  "帮我解释一个概念",
  "出一道练习题来测试我",
  "帮我总结一下这个知识点",
  "我做错了这道题，帮我分析原因",
];

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [streaming, setStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamAccRef = useRef("");
  const streamSourcesRef = useRef<ChatMessage["sources"]>(undefined);
  const streamRafRef = useRef<number | null>(null);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get<{ messages?: ChatMessage[]; title?: string }>(`/chat/sessions/${sessionId}/messages`);
      if (res.title) setSessionTitle(res.title);
      const list = res.messages;
      if (Array.isArray(list) && list.length > 0) {
        setMessages(
          list.map((m) => ({
            ...m,
            id: m.id || genId(),
          }))
        );
      } else {
        setMessages([]);
      }
    } catch {
      setHistoryError("无法加载会话历史，请检查网络或稍后重试。");
    } finally {
      setHistoryLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (!sessionId) {
      setHistoryLoading(false);
      return;
    }
    setMessages([]);
    void loadHistory();
  }, [sessionId, loadHistory]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId || streaming) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (streamRafRef.current !== null) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }
    streamAccRef.current = "";
    streamSourcesRef.current = undefined;

    const userMsg: ChatMessage = { id: genId(), role: "user", content: text };
    const aiId = genId();
    const aiMsg: ChatMessage = { id: aiId, role: "assistant", content: "", streaming: true, sources: undefined };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    const flushFrame = () => {
      streamRafRef.current = null;
      const acc = streamAccRef.current;
      const srcSnap = streamSourcesRef.current;
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: acc, sources: srcSnap ?? m.sources } : m))
      );
    };

    await api.postStream(
      `/chat/sessions/${sessionId}/messages/stream`,
      { content: text, mode },
      (chunk) => {
        const src = extractSources(chunk);
        if (src?.length) streamSourcesRef.current = src;
        streamAccRef.current = mergeStreamChunk(streamAccRef.current, chunk);
        if (streamRafRef.current === null) {
          streamRafRef.current = requestAnimationFrame(flushFrame);
        }
      },
      () => {
        if (streamRafRef.current !== null) {
          cancelAnimationFrame(streamRafRef.current);
          streamRafRef.current = null;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  content: streamAccRef.current,
                  streaming: false,
                  sources: streamSourcesRef.current ?? m.sources,
                }
              : m
          )
        );
        setStreaming(false);
      },
      (err) => {
        if (streamRafRef.current !== null) {
          cancelAnimationFrame(streamRafRef.current);
          streamRafRef.current = null;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiId ? { ...m, content: `错误：${err}`, streaming: false } : m
          )
        );
        setStreaming(false);
      }
    );
  }, [input, sessionId, streaming, mode]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0 bg-[--bg-primary]/95 backdrop-blur-md shadow-[0_1px_0_0_var(--border-subtle)]">
        <h2 className="text-[15px] font-semibold text-[--text-primary] truncate min-w-0 tracking-tight">
          {sessionTitle || new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" }) + "的对话"}
        </h2>
        <Link
          href="/chat"
          className="sf-btn-ghost shrink-0 text-[13px] text-[--accent] rounded-full px-3 py-1.5 hover:bg-[--bg-card]"
        >
          返回列表
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {historyLoading && messages.length === 0 && (
          <div className="space-y-4 py-4 animate-pulse" aria-busy="true" aria-label="加载消息">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex mb-4 gap-2 items-end ${i % 2 === 0 ? "justify-end flex-row-reverse" : "justify-start"}`}
              >
                <div className="h-8 w-8 shrink-0 rounded-full sf-skeleton shadow-[0_0_0_1px_rgba(208,205,195,0.25)]" />
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-3 space-y-2 shadow-[0_0_0_1px_rgba(208,205,195,0.18),0_4px_16px_rgba(0,0,0,0.04)]"
                  style={i % 2 === 0 ? { background: "var(--user-bubble)" } : { background: "var(--bg-card)" }}
                >
                  <div className="sf-skeleton h-3 w-[min(100%,200px)]" />
                  <div className="sf-skeleton h-3 w-[min(100%,160px)]" />
                  {i % 2 === 1 && <div className="sf-skeleton h-3 w-[min(100%,120px)]" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {historyError && (
          <div
            className="mb-4 rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-800 shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_4px_16px_rgba(239,68,68,0.08)] dark:text-red-200"
            role="alert"
          >
            <p>{historyError}</p>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="sf-btn-primary mt-2 px-4 py-1.5 text-[12px] font-medium rounded-full"
            >
              重试加载
            </button>
          </div>
        )}

        {!historyLoading && !historyError && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <img src="/images/platform/logo.png" alt="" className="w-16 h-16 object-contain mb-4 opacity-60" />
            <p className="text-[17px] font-semibold text-[--text-primary] tracking-tight mb-1">开始新对话</p>
            <p className="text-[13px] text-[--text-secondary] mb-8">试试下面的问题，或直接输入你想问的</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInput(q); }}
                  className="sf-btn-ghost text-left px-4 py-3 rounded-2xl text-[14px] text-[--text-secondary] hover:text-[--text-primary] shadow-[0_0_0_1px_var(--border-subtle)] hover:shadow-[0_0_0_1px_var(--ring-warm),0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && !msg.streaming && (
              <div className="mb-2 ml-10 sf-card rounded-[20px] p-3 text-[12px] text-[--text-secondary]">
                <p className="font-medium text-[--text-primary] mb-1.5">参考来源</p>
                <ul className="space-y-1.5">
                  {msg.sources.map((s, i) => (
                    <li key={i}>
                      {s.url ? (
                        <a href={s.url} className="text-[--accent] hover:underline" target="_blank" rel="noreferrer">
                          {s.title ?? s.url}
                        </a>
                      ) : (
                        <span>{s.title ?? "来源"}</span>
                      )}
                      {s.snippet && <span className="block text-[--text-muted] mt-0.5">{s.snippet}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <MessageBubble
              role={msg.role}
              content={msg.content}
              isStreaming={msg.streaming}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 px-4 py-3 bg-[--bg-primary]/90 backdrop-blur-md shadow-[0_-1px_0_0_var(--border-subtle)]">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={
                mode === m.id
                  ? "sf-badge bg-[--accent] text-[--accent-text] shadow-[0_0_0_1px_var(--accent)] hover:bg-[--accent-hover]"
                  : "sf-badge hover:bg-[--chip-hover-bg]"
              }
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 sf-input px-3 py-2 rounded-2xl">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = textareaRef.current;
              if (el) {
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }
            }}
            onKeyDown={onKey}
            placeholder="输入消息…"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none bg-transparent px-1 py-2 text-[15px] focus:outline-none placeholder:text-[--text-muted] text-[--text-primary] max-h-[120px]"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || streaming}
            className="sf-btn-primary w-10 h-10 flex items-center justify-center rounded-full p-0 disabled:opacity-30 shrink-0"
            aria-label="发送"
          >
            <IconSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
