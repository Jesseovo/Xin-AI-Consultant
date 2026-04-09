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

export default function MessageBubble({
  role,
  content,
  isStreaming = false,
  sources,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.25, 0.4, 0.25, 1] }}
    >
      <div className="min-w-0 max-w-[85%] sm:max-w-[75%] flex flex-col gap-2">
        <div
          className={
            isUser
              ? "px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed rounded-2xl whitespace-pre-wrap break-words"
              : "sf-card px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed rounded-2xl prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 overflow-hidden break-words"
          }
          style={
            isUser
              ? {
                  background: "var(--user-bubble)",
                  color: "var(--user-bubble-text)",
                }
              : undefined
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
                  <div
                    className="sf-card px-3 py-2 max-w-full sm:max-w-[280px] cursor-default hover:border-[--accent]/40"
                    style={{ borderRadius: "12px" }}
                  >
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
    </motion.div>
  );
}
