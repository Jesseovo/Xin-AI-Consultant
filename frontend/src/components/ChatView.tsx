"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore, type Message } from "@/lib/chatStore";
import { useSSE } from "@/lib/useSSE";
import MessageBubble from "./MessageBubble";
import TeacherCard from "./TeacherCard";

const QUICK_QUESTIONS = [
  "软件工程专业核心课程有哪些？",
  "考研应该怎么准备？",
  "毕业后一般从事什么工作？",
  "专业学费是多少？",
  "毕业设计流程是什么？",
  "保研需要什么条件？",
];

interface ChatViewProps {
  initialQuestion?: string | null;
}

export default function ChatView({ initialQuestion }: ChatViewProps) {
  const {
    activeConversation,
    addMessage,
    updateMessage,
    dispatch,
    genId,
  } = useChatStore();
  const { sendStream, isStreaming, abort } = useSSE();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialSentRef = useRef(false);

  const convId = activeConversation?.id;
  const messages = activeConversation?.messages ?? [];

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isStreaming || !convId) return;

      const userMsg: Message = {
        id: genId(),
        role: "user",
        content: question.trim(),
      };
      addMessage(convId, userMsg);

      if (messages.length === 0) {
        dispatch({
          type: "SET_TITLE",
          convId,
          title: question.trim().slice(0, 24),
        });
      }

      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      const aiMsgId = genId();
      const placeholderMsg: Message = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        streaming: true,
      };
      addMessage(convId, placeholderMsg);

      await sendStream(question.trim(), {
        onMeta: (evt) => {
          if (evt.teacher_contact) {
            updateMessage(convId, aiMsgId, "", true);
            const tcId = genId();
            const tcMsg: Message = {
              id: tcId,
              role: "assistant",
              content: "",
              teacherContact: {
                name: evt.teacher_contact.name,
                contact: evt.teacher_contact.contact,
                type: evt.teacher_contact.type,
              },
            };
            addMessage(convId, tcMsg);
          }
        },
        onDelta: (_chunk, accumulated) => {
          updateMessage(convId, aiMsgId, accumulated, true);
        },
        onDone: (fullText) => {
          updateMessage(convId, aiMsgId, fullText, false);
        },
        onError: (errorMsg) => {
          updateMessage(convId, aiMsgId, errorMsg, false);
        },
      });
    },
    [convId, isStreaming, messages.length, addMessage, updateMessage, dispatch, genId, sendStream]
  );

  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (initialQuestion && !initialSentRef.current && convId) {
      initialSentRef.current = true;
      sendMessageRef.current(initialQuestion);
    }
  }, [convId, initialQuestion]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="max-w-3xl mx-auto space-y-1">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.content && (
                <MessageBubble
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.streaming}
                />
              )}
              {msg.teacherContact && (
                <TeacherCard
                  name={msg.teacherContact.name}
                  contact={msg.teacherContact.contact}
                  contactType={msg.teacherContact.type}
                />
              )}
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/bots/default-bot.png"
                alt="AI 助手"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover"
              />
              <div className="bg-[--bg-card]/80 border border-[--border-subtle] rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-[--accent] rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-[--accent] rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-[--accent] rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {!isStreaming && (
        <div className="px-3 sm:px-6 pb-1">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-2.5 py-1 bg-[--bg-card]/60 border border-[--border-subtle] rounded-full text-[--text-secondary] hover:bg-[--bg-card-hover] hover:border-[--accent]/30 hover:text-[--accent] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-3 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto bg-[--bg-card]/60 rounded-2xl border border-[--border-subtle] shadow-sm p-1.5">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="继续提问..."
              rows={1}
              aria-label="输入问题"
              className="flex-1 resize-none px-3 py-2.5 text-sm bg-transparent focus:outline-none placeholder:text-[--text-muted] text-[--text-primary]"
              style={{ maxHeight: "120px" }}
            />
            {isStreaming ? (
              <button
                onClick={abort}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-[--accent-text] rounded-xl transition-colors"
                aria-label="停止生成"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-[--accent] hover:opacity-90 disabled:opacity-30 text-[--accent-text] rounded-xl transition-colors"
                aria-label="发送"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
