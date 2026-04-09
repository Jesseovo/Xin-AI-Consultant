"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ChatSessionSummary } from "@/lib/tutor-types";

/** API may include preview text; optional for display only */
type SessionListItem = ChatSessionSummary & { last_message_preview?: string };

const MOCK_SESSIONS: SessionListItem[] = [
  {
    id: "demo-1",
    title: "高等数学 · 极限复习",
    bot_name: "高数助教",
    last_message_at: new Date().toISOString(),
    message_count: 12,
    last_message_preview: "洛必达法则在这道题里可以这样用…",
  },
  {
    id: "demo-2",
    title: "数据结构 · 二叉树",
    bot_name: "算法导师",
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    message_count: 8,
    last_message_preview: "先序遍历的顺序是根、左、右…",
  },
];

interface SessionsResponse {
  items?: ChatSessionSummary[];
  sessions?: ChatSessionSummary[];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function previewLine(s: SessionListItem): string {
  const p = s.last_message_preview?.trim();
  if (p) return p;
  return `与 ${s.bot_name} 的对话`;
}

export default function ChatSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SessionsResponse>("/chat/sessions");
      const list = res.items ?? res.sessions ?? [];
      setIsDemo(false);
      setSessions(Array.isArray(list) && list.length > 0 ? (list as SessionListItem[]) : MOCK_SESSIONS);
    } catch {
      setIsDemo(true);
      setSessions(MOCK_SESSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const newChat = useCallback(async () => {
    setCreating(true);
    try {
      const res = await api.post<{ id: string }>("/chat/sessions", { title: "新对话" });
      if (res?.id) router.push(`/chat/${res.id}`);
      else router.push("/chat/demo-1");
    } catch {
      router.push(`/chat/demo-${Date.now()}`);
    } finally {
      setCreating(false);
    }
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 min-h-[60vh]">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">对话</h1>
          <p className="text-[13px] text-[--text-secondary] mt-0.5">选择会话继续，或开始新对话</p>
        </div>
        <button
          type="button"
          onClick={newChat}
          disabled={creating}
          className="sf-btn-primary shrink-0 text-[14px] px-5 py-2.5 rounded-full disabled:opacity-50"
        >
          {creating ? "创建中…" : "新对话"}
        </button>
      </div>

      {isDemo && (
        <div
          className="mx-0 mt-2 mb-6 rounded-[20px] bg-amber-50/90 dark:bg-amber-950/35 px-4 py-3 text-sm text-amber-900 dark:text-amber-100/90 shadow-[0_0_0_1px_rgba(245,158,11,0.35),0_4px_16px_rgba(245,158,11,0.08)]"
          role="status"
        >
          ⚠ 无法连接服务器，当前显示演示数据
        </div>
      )}

      {loading ? (
        <ul className="space-y-3 animate-pulse" aria-busy="true" aria-label="加载会话">
          {[0, 1, 2].map((i) => (
            <li key={i} className="sf-card rounded-[20px] p-4">
              <div className="sf-skeleton h-4 w-[min(70%,280px)]" />
              <div className="sf-skeleton h-3 w-[55%] mt-3" />
              <div className="flex justify-between gap-3 mt-4">
                <div className="sf-skeleton h-3 w-24" />
                <div className="sf-skeleton h-3 w-16" />
              </div>
            </li>
          ))}
        </ul>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="sf-card rounded-[20px] p-10 max-w-md w-full shadow-[0_0_0_1px_rgba(208,205,195,0.2),0_12px_40px_rgba(20,20,19,0.06)]">
            <div className="relative mx-auto mb-6 w-[min(100%,280px)] aspect-[4/3]">
              <Image
                src="/images/platform/empty-chat.png"
                alt=""
                fill
                className="object-contain drop-shadow-[0_8px_32px_rgba(201,100,66,0.12)]"
                sizes="280px"
                priority
              />
            </div>
            <p className="text-[17px] font-semibold text-[--text-primary] tracking-tight">还没有对话</p>
            <p className="text-[14px] text-[--text-secondary] mt-2 leading-relaxed">
              开启一段与助教的对话，问题与草稿都会保存在这里。
            </p>
            <button
              type="button"
              onClick={newChat}
              disabled={creating}
              className="sf-btn-primary mt-8 px-8 py-3 text-[15px] rounded-full disabled:opacity-50"
            >
              {creating ? "创建中…" : "开始新对话"}
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/chat/${s.id}`} className="block sf-card rounded-[20px] p-4 no-underline">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-[--text-primary] truncate">{s.title}</p>
                    <p className="text-[13px] text-[--text-secondary] mt-1 line-clamp-2 leading-snug">
                      {previewLine(s)}
                    </p>
                  </div>
                  <div className="text-right shrink-0 text-[12px] text-[--text-muted]">
                    <p>{formatTime(s.last_message_at)}</p>
                    <p className="mt-0.5">{s.message_count} 条消息</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
