"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ChatSessionSummary } from "@/lib/tutor-types";

const MOCK_SESSIONS: ChatSessionSummary[] = [
  {
    id: "demo-1",
    title: "高等数学 · 极限复习",
    bot_name: "高数助教",
    last_message_at: new Date().toISOString(),
    message_count: 12,
  },
  {
    id: "demo-2",
    title: "数据结构 · 二叉树",
    bot_name: "算法导师",
    last_message_at: new Date(Date.now() - 86400000).toISOString(),
    message_count: 8,
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

export default function ChatSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SessionsResponse>("/chat/sessions");
      const list = res.items ?? res.sessions ?? [];
      setSessions(Array.isArray(list) && list.length > 0 ? list : MOCK_SESSIONS);
    } catch {
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">对话</h1>
          <p className="text-[13px] text-[--text-secondary] mt-0.5">选择会话继续，或开始新对话</p>
        </div>
        <button
          type="button"
          onClick={newChat}
          disabled={creating}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-[--accent] text-white text-[14px] font-medium disabled:opacity-50"
        >
          {creating ? "创建中…" : "新对话"}
        </button>
      </div>

      {loading ? (
        <p className="text-[14px] text-[--text-muted]">加载会话…</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/chat/${s.id}`}
                className="block sf-card rounded-2xl p-4 hover:scale-[1.01] no-underline"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[--text-primary] truncate">{s.title}</p>
                    <p className="text-[13px] text-[--text-secondary] mt-0.5">{s.bot_name}</p>
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
