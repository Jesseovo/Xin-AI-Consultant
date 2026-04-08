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

export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [streaming, setStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
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
      const res = await api.get<{ messages?: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle] shrink-0">
        <Link href="/chat" className="text-[13px] text-[--accent] hover:underline shrink-0">
          返回列表
        </Link>
        <span className="text-[13px] text-[--text-muted] truncate">会话 {sessionId}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {historyLoading && messages.length === 0 && (
          <div className="space-y-4 py-4 animate-pulse" aria-busy="true" aria-label="加载消息">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex mb-4 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="sf-card max-w-[75%] rounded-2xl px-4 py-3 space-y-2"
                  style={i % 2 === 0 ? { background: "var(--user-bubble)" } : undefined}
                >
                  <div className="h-3 rounded bg-[--bg-card-hover] w-[min(100%,200px)]" />
                  <div className="h-3 rounded bg-[--bg-card-hover] w-[min(100%,160px)]" />
                  {i % 2 === 1 && <div className="h-3 rounded bg-[--bg-card-hover] w-[min(100%,120px)]" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {historyError && (
          <div
            className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700 dark:text-red-300"
            role="alert"
          >
            <p>{historyError}</p>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="mt-2 px-3 py-1.5 rounded-lg bg-[--accent] text-white text-[12px] font-medium"
            >
              重试加载
            </button>
          </div>
        )}

        {!historyLoading && !historyError && messages.length === 0 && (
          <p className="text-[14px] text-[--text-secondary] text-center py-12">输入问题开始对话</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && !msg.streaming && (
              <div className="mb-2 ml-10 sf-card rounded-xl p-3 text-[12px] text-[--text-secondary]">
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

      <div className="shrink-0 border-t border-[--border-subtle] px-4 py-3 bg-[--bg-primary]/90 backdrop-blur-md">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3 py-1 rounded-full text-[12px] border transition-colors ${
                mode === m.id
                  ? "bg-[--accent]/15 border-[--accent]/40 text-[--accent]"
                  : "border-[--chip-border] bg-[--chip-bg] text-[--text-secondary]"
              }`}
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
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[--accent] text-white disabled:opacity-30 shrink-0"
            aria-label="发送"
          >
            <IconSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
