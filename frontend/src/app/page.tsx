"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSSE } from "@/lib/useSSE";
import { useTheme } from "@/lib/theme";
import MessageBubble from "@/components/MessageBubble";
import TeacherCard from "@/components/TeacherCard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  waiting?: boolean;
  teacherContact?: { name: string; contact: string; type: string };
}

const AVATAR_URL =
  "https://kian-takeout.oss-cn-beijing.aliyuncs.com/26e83978-7272-46c0-8d76-0984c8d18837.jpg";

const QUICK = [
  { emoji: "📖", label: "核心课程", q: "软件工程专业核心课程有哪些？" },
  { emoji: "🎯", label: "考研准备", q: "考研应该怎么准备？" },
  { emoji: "💼", label: "就业方向", q: "毕业后一般从事什么工作？" },
  { emoji: "🎓", label: "保研条件", q: "保研需要什么条件？" },
  { emoji: "💰", label: "学费标准", q: "专业学费是多少？" },
  { emoji: "📝", label: "毕业设计", q: "毕业设计流程是什么？" },
];

const WHISPERS = [
  "今天也要加油鸭",
  "有人说，认真的样子最好看",
  "偷偷告诉你，夹心觉得彤最好看",
  "学累了就休息一下吧",
  "代码会骗人，但彤不会",
  "bug 修不完，但想你这件事不会停",
  "今天的风很温柔，像某个人",
  "世界上最短的咒语：彤",
  "有些人值得反复编译",
  "好好学习，天天想彤",
  "你来了，今天的数据都变好看了",
  "有人在偷偷想你，不信你回头看看",
  "每行代码都有温度，像你一样",
  "最优解只有一个，刚好是你",
  "有些变量，一旦赋值就不想释放",
  "心里装了个人，内存一直占满",
];

const ETA_STORAGE_KEY = "avg-response-ms";

function getEstimate(): number {
  try {
    const v = localStorage.getItem(ETA_STORAGE_KEY);
    if (v) return Math.max(3000, Math.min(parseInt(v, 10), 30000));
  } catch { /* ignore */ }
  return 6000;
}

function recordResponseTime(ms: number) {
  try {
    const prev = getEstimate();
    const next = Math.round(prev * 0.6 + ms * 0.4);
    localStorage.setItem(ETA_STORAGE_KEY, String(next));
  } catch { /* ignore */ }
}

let _id = 0;
function genId() {
  return `m${Date.now().toString(36)}${(++_id).toString(36)}`;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[--bg-card-hover] transition-colors"
    >
      {theme === "dark" ? (
        <svg className="w-[18px] h-[18px] text-[--text-secondary]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      ) : (
        <svg className="w-[18px] h-[18px] text-[--text-secondary]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      )}
    </button>
  );
}

function ThinkingBubble({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  const estimate = useMemo(() => getEstimate(), []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 300);
    return () => clearInterval(timer);
  }, [startTime]);

  const elapsedSec = Math.floor(elapsed / 1000);
  const estSec = Math.ceil(estimate / 1000);
  const remaining = estSec - elapsedSec;

  let timeText: string;
  if (remaining > 0) {
    timeText = `预计 ${remaining}s`;
  } else {
    timeText = `已等待 ${elapsedSec}s`;
  }

  return (
    <div className="flex items-start gap-2.5 mb-4 animate-fade">
      <img src={AVATAR_URL} alt="Xin" className="flex-shrink-0 w-8 h-8 rounded-full object-cover" />
      <div className="sf-glass rounded-2xl rounded-bl-md px-4 py-3 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-[--accent] rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-[--accent] rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-[--accent] rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-[13px] text-[--text-secondary]">
            Thinking<span className="text-[--text-muted]">{` · ${timeText}`}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const { sendStream, isStreaming, abort } = useSSE();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const sendStartRef = useRef(0);
  const hasMessages = messages.length > 0;

  const whisper = useMemo(() => WHISPERS[Math.floor(Math.random() * WHISPERS.length)], []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || isStreaming || sendingRef.current) return;
      sendingRef.current = true;
      sendStartRef.current = Date.now();

      const userMsg: Message = { id: genId(), role: "user", content: q };
      const aiId = genId();
      const aiMsg: Message = { id: aiId, role: "assistant", content: "", streaming: true, waiting: true };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";

      let firstDeltaRecorded = false;

      await sendStream(q, {
        onMeta: (evt) => {
          const tc = evt.teacher_contact;
          if (tc) {
            setMessages((prev) => [
              ...prev,
              {
                id: genId(),
                role: "assistant",
                content: "",
                teacherContact: { name: tc.name, contact: tc.contact, type: tc.type },
              },
            ]);
          }
        },
        onDelta: (_c, acc) => {
          if (!firstDeltaRecorded) {
            firstDeltaRecorded = true;
            recordResponseTime(Date.now() - sendStartRef.current);
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: acc, waiting: false } : m))
          );
        },
        onDone: (full) => {
          if (!firstDeltaRecorded) {
            recordResponseTime(Date.now() - sendStartRef.current);
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: full, streaming: false, waiting: false } : m))
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: err, streaming: false, waiting: false } : m))
          );
        },
      });
      sendingRef.current = false;
    },
    [isStreaming, sendStream]
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clear = () => {
    if (isStreaming) abort();
    setMessages([]);
    setInput("");
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden relative">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[120px]" style={{ background: "var(--ambient-a)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: "var(--ambient-b)" }} />
      </div>

      {/* Header */}
      {hasMessages && (
        <header className="relative z-10 flex items-center justify-center px-5 h-12 flex-shrink-0 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <button onClick={clear} className="absolute left-4 text-[13px] text-[--accent] hover:opacity-70 transition-opacity">
            新对话
          </button>
          <div className="flex items-center gap-2">
            <img src={AVATAR_URL} alt="Xin" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-[13px] font-medium text-[--text-secondary]">Xin</span>
          </div>
          <div className="absolute right-4">
            <ThemeToggle />
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col min-h-0 relative z-10">
        {!hasMessages ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
            <div className="w-full max-w-lg flex flex-col items-center animate-in">
              <div className="fixed top-4 right-4 z-20">
                <ThemeToggle />
              </div>

              <div className="mb-6">
                <img
                  src={AVATAR_URL}
                  alt="Xin"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-2xl ring-[3px]"
                  style={{ boxShadow: "0 25px 50px -12px var(--shadow-avatar)", borderColor: "var(--ring-avatar)" }}
                />
              </div>

              <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-center mb-1.5">
                Hi, I&apos;m Xin
              </h1>
              <p className="text-[15px] text-[--text-secondary] text-center mb-10 leading-relaxed">
                齐齐哈尔大学 · 软件工程专业<br />
                <span className="text-[--text-muted]">有什么可以帮你的？</span>
              </p>

              <div className="w-full mb-2">
                <div className="flex items-end gap-2 sf-input px-3 py-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); autoResize(); }}
                    onKeyDown={onKey}
                    placeholder="问我任何问题..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-1 py-1 text-[15px] focus:outline-none placeholder:text-[--text-muted] text-[--text-primary]"
                    style={{ maxHeight: "120px" }}
                    autoFocus
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[--accent] text-white disabled:opacity-20 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m-7.5-7.5L19.5 12l-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[--text-muted] mb-7 text-center opacity-60 italic">
                {whisper}
              </p>

              <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5 animate-fade [animation-delay:0.2s]">
                {QUICK.map((item) => (
                  <button
                    key={item.q}
                    onClick={() => send(item.q)}
                    className="sf-card px-4 py-3.5 text-left"
                  >
                    <span className="text-[17px] block mb-1">{item.emoji}</span>
                    <span className="text-[13px] font-medium text-[--text-primary] block leading-snug">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <div className="max-w-2xl mx-auto">
              {/* Top card */}
              <div className="flex flex-col items-center mb-8 pt-4">
                <img src={AVATAR_URL} alt="Xin" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mb-3 shadow-lg" style={{ boxShadow: "0 8px 24px -4px var(--shadow-avatar)" }} />
                <p className="text-[16px] sm:text-[18px] font-semibold text-[--text-primary]">Xin</p>
                <p className="text-[13px] text-[--text-secondary] mt-1">齐齐哈尔大学 · 软件工程智能助手</p>
                <p className="text-[11px] text-[--text-muted] mt-1">基于专业知识库，为你解答学业问题</p>
              </div>

              <div className="space-y-1">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.waiting && msg.content === "" && msg.streaming && (
                      <ThinkingBubble startTime={sendStartRef.current} />
                    )}
                    {msg.content !== "" && !msg.teacherContact && (
                      <MessageBubble
                        role={msg.role}
                        content={msg.content}
                        streaming={msg.streaming}
                        avatarUrl={msg.role === "assistant" ? AVATAR_URL : undefined}
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
                <div ref={bottomRef} />
              </div>
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="px-4 sm:px-6 py-3 flex-shrink-0">
            {!isStreaming && (
              <div className="max-w-2xl mx-auto mb-2 overflow-x-auto">
                <div className="flex gap-1.5 w-max">
                  {QUICK.map((item) => (
                    <button
                      key={item.q}
                      onClick={() => send(item.q)}
                      className="text-[12px] px-3 py-1.5 rounded-full text-[--text-muted] border transition-all whitespace-nowrap"
                      style={{ background: "var(--chip-bg)", borderColor: "var(--chip-border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--chip-hover-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--chip-bg)"; }}
                    >
                      {item.emoji} {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end gap-2 sf-input px-3 py-2">
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={onKey}
                  placeholder="继续提问..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent px-1 py-1 text-[14px] focus:outline-none placeholder:text-[--text-muted] text-[--text-primary]"
                  style={{ maxHeight: "120px" }}
                />
                {isStreaming ? (
                  <button
                    onClick={abort}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#ff453a] text-white transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => send(input)}
                    disabled={!input.trim()}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[--accent] text-white disabled:opacity-20 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m-7.5-7.5L19.5 12l-7.5 7.5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
