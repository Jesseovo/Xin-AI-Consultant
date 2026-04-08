"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { TutorBotSummary } from "@/lib/tutor-types";

const MOCK_BOTS: TutorBotSummary[] = [
  {
    id: "b1",
    name: "高数助教 Xin",
    description: "高等数学、微积分与线性代数答疑与例题讲解。",
    subject_tags: ["数学", "高数"],
    teacher_name: "王老师",
    usage_count: 1280,
  },
  {
    id: "b2",
    name: "程序设计导师",
    description: "C/C++、Python 与数据结构学习路线与调试建议。",
    subject_tags: ["编程", "数据结构"],
    teacher_name: "李老师",
    usage_count: 956,
  },
  {
    id: "b3",
    name: "大学英语陪练",
    description: "写作、口语与四六级备考策略。",
    subject_tags: ["英语"],
    teacher_name: "张老师",
    usage_count: 742,
  },
];

interface BotsResponse {
  items?: TutorBotSummary[];
  bots?: TutorBotSummary[];
}

export default function BotsGalleryPage() {
  const router = useRouter();
  const [bots, setBots] = useState<TutorBotSummary[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<BotsResponse>("/bots");
        const list = res.items ?? res.bots ?? [];
        if (!cancelled) setBots(Array.isArray(list) && list.length > 0 ? list : MOCK_BOTS);
      } catch {
        if (!cancelled) setBots(MOCK_BOTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    bots.forEach((b) => b.subject_tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [bots]);

  const filtered = useMemo(() => {
    if (!filter) return bots;
    return bots.filter((b) => b.subject_tags.includes(filter));
  }, [bots, filter]);

  const startChat = useCallback(
    async (botId: string) => {
      try {
        const res = await api.post<{ id: string }>("/chat/sessions", { bot_id: botId, title: "新对话" });
        if (res?.id) router.push(`/chat/${res.id}`);
        else router.push(`/chat/demo-${botId}`);
      } catch {
        router.push(`/chat/demo-${botId}`);
      }
    },
    [router]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">导师机器人</h1>
        <p className="text-[13px] text-[--text-secondary] mt-0.5">选择学科与机器人，开始个性化辅导</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-full text-[12px] border ${
            filter === "" ? "bg-[--accent]/15 border-[--accent]/40 text-[--accent]" : "border-[--chip-border] bg-[--chip-bg] text-[--text-secondary]"
          }`}
        >
          全部
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-[12px] border ${
              filter === t ? "bg-[--accent]/15 border-[--accent]/40 text-[--accent]" : "border-[--chip-border] bg-[--chip-bg] text-[--text-secondary]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[14px] text-[--text-muted]">加载中…</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((b, i) => (
            <article
              key={b.id}
              className="sf-card rounded-2xl p-5 flex flex-col hover:scale-[1.01]"
            >
              <div
                className={`w-full h-36 rounded-xl mb-4 bg-gradient-to-br ${
                  i % 3 === 0
                    ? "from-blue-500/20 to-purple-500/20"
                    : i % 3 === 1
                      ? "from-emerald-500/20 to-cyan-500/20"
                      : "from-orange-500/20 to-rose-500/20"
                }`}
              />
              <h2 className="text-[17px] font-semibold text-[--text-primary]">{b.name}</h2>
              <p className="text-[13px] text-[--text-secondary] mt-1.5 leading-relaxed flex-1">{b.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {b.subject_tags.map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-[--chip-bg] border border-[--chip-border] text-[--text-secondary]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[12px] text-[--text-muted] mt-3">
                教师 {b.teacher_name} · 使用 {b.usage_count} 次
              </p>
              <button
                type="button"
                onClick={() => void startChat(b.id)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[--accent] text-white text-[14px] font-medium"
              >
                开始对话
              </button>
            </article>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <p className="text-[14px] text-[--text-muted] text-center py-12">该标签下暂无机器人</p>
      )}

      <p className="mt-8 text-center text-[13px] text-[--text-muted]">
        <Link href="/chat" className="text-[--accent] hover:underline">
          查看我的对话
        </Link>
      </p>
    </div>
  );
}
