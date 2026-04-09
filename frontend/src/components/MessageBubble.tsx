"use client";

import "highlight.js/styles/github.css";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

function safeUrlTransform(url: string): string {
  const safe = ["http:", "https:", "mailto:"];
  try {
    const u = new URL(url, "https://placeholder.com");
    return safe.includes(u.protocol) ? url : "";
  } catch {
    return url.startsWith("/") ? url : "";
  }
}

export interface MessageSource {
  text: string;
  source: string;
  score: number;
}

export interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  sources?: MessageSource[];
}

function isProbablyUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "—";
  return `${(score * 100).toFixed(1)}%`;
}

function ChatAvatar({ role }: { role: "user" | "assistant" }) {
  const isUser = role === "user";
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-tight shadow-[0_0_0_1px_var(--ring-warm),0_2px_8px_var(--shadow-avatar)] ${
        isUser ? "bg-[var(--user-avatar-bg)] text-[var(--user-avatar-text)]" : "bg-[var(--bubble-assistant-avatar)] text-[--text-secondary]"
      }`}
      aria-hidden
    >
      {isUser ? "我" : "答"}
    </div>
  );
}

export default function MessageBubble({
  role,
  content,
  isStreaming = false,
  sources,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      className={`flex items-end gap-2 mb-4 ${isUser ? "justify-end" : "justify-start"}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {!isUser && <ChatAvatar role="assistant" />}
      <div className="min-w-0 max-w-[85%] sm:max-w-[75%] flex flex-col gap-2">
        <div
          className={
            isUser
              ? "px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed rounded-2xl whitespace-pre-wrap break-words bg-[var(--user-bubble)] text-[var(--user-bubble-text)] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_18px_rgba(201,100,66,0.2)]"
              : "px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed rounded-2xl prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 overflow-hidden break-words bg-[var(--bubble-assistant)] text-[--text-primary] shadow-[0_0_0_1px_var(--border-subtle),0_4px_20px_rgba(0,0,0,0.06)] [&_pre]:rounded-xl [&_pre]:!bg-[var(--bubble-assistant-code)] [&_pre]:shadow-[inset_0_0_0_1px_var(--bubble-assistant-code-ring)] [&_pre]:p-4 [&_code.hljs]:!bg-transparent [&_pre_code]:!bg-transparent [&_code]:rounded-md [&_code]:!bg-[var(--bubble-assistant-code)]"
          }
        >
          {isUser ? (
            content
          ) : (
            <>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                urlTransform={safeUrlTransform}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block ml-0.5 align-baseline animate-pulse text-[--accent]" aria-hidden>
                  ...
                </span>
              )}
            </>
          )}
        </div>

        {!isUser && sources && sources.length > 0 && (
          <div className="flex flex-col gap-1.5 pl-0 sm:pl-1">
            <p className="text-[11px] font-medium text-[--text-muted] uppercase tracking-wide">参考来源</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, i) => {
                const href = isProbablyUrl(s.source) ? s.source : undefined;
                const Card = (
                  <div className="sf-card px-3 py-2 max-w-full sm:max-w-[280px] cursor-default rounded-[20px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(139,111,71,0.12)]">
                    <p className="text-[12px] text-[--text-primary] line-clamp-2 leading-snug">{s.text || "（无摘要）"}</p>
                    <p className="text-[11px] text-[--text-secondary] mt-1 truncate" title={s.source}>
                      {s.source}
                    </p>
                    <p className="text-[10px] text-[--text-muted] mt-0.5">相关度 {formatScore(s.score)}</p>
                  </div>
                );
                return href ? (
                  <a key={`${s.source}-${i}`} href={href} target="_blank" rel="noopener noreferrer" className="no-underline text-inherit">
                    {Card}
                  </a>
                ) : (
                  <div key={`${s.source}-${i}`} className="contents">
                    {Card}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {isUser && <ChatAvatar role="user" />}
    </motion.div>
  );
}
