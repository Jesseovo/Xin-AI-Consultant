"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  avatarUrl?: string;
}

export default function MessageBubble({ role, content, streaming, avatarUrl }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fade`}>
      {!isUser && (
        avatarUrl ? (
          <img src={avatarUrl} alt="Xin" className="flex-shrink-0 w-8 h-8 rounded-full object-cover mr-2.5 mt-0.5" />
        ) : (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[--bg-card] flex items-center justify-center text-[--text-secondary] text-xs font-medium mr-2.5 mt-0.5">X</div>
        )
      )}
      <div
        className={`min-w-0 px-4 py-3 text-[14px] sm:text-[15px] leading-relaxed ${
          isUser
            ? "max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md whitespace-pre-wrap break-words"
            : "max-w-[85%] sm:max-w-[75%] sf-glass rounded-2xl rounded-bl-md prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 overflow-hidden break-words"
        }`}
        style={isUser ? { background: "var(--user-bubble)", color: "var(--user-bubble-text)" } : undefined}
      >
        {isUser ? (
          content
        ) : (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {streaming && (
              <span className="inline-block w-[2px] h-[1.1em] bg-[--accent] ml-0.5 align-text-bottom animate-pulse" />
            )}
          </>
        )}
      </div>
      {isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ml-2.5 mt-0.5"
          style={{ background: "var(--user-avatar-bg)", color: "var(--user-avatar-text)" }}
        >
          我
        </div>
      )}
    </div>
  );
}
