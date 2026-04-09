"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { TutorBotSummary } from "@/lib/tutor-types";

const BOT_AVATARS = [
  "/images/bots/math-bot.png",
  "/images/bots/code-bot.png",
  "/images/bots/english-bot.png",
  "/images/bots/general-bot.png",
  "/images/bots/default-bot.png",
];

const MOCK_BOTS: TutorBotSummary[] = [
  {
    id: "b1",
    name: "高数助教 Xin",
    description: "高等数学、微积分与线性代数答疑与例题讲解。",
    subject_tags: ["数学", "高数"],
    teacher_name: "王老师",
    usage_count: 1280,
    avatar: "/images/bots/math-bot.png",
  },
  {
    id: "b2",
    name: "程序设计导师",
    description: "C/C++、Python 与数据结构学习路线与调试建议。",
    subject_tags: ["编程", "数据结构"],
    teacher_name: "李老师",
    usage_count: 956,
    avatar: "/images/bots/code-bot.png",
  },
  {
    id: "b3",
    name: "大学英语陪练",
    description: "写作、口语与四六级备考策略。",
    subject_tags: ["英语"],
    teacher_name: "张老师",
    usage_count: 742,
    avatar: "/images/bots/english-bot.png",
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
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<BotsResponse>("/bots");
        const list = res.items ?? res.bots ?? [];
        if (!cancelled) {
          setIsDemo(false);
          setBots(Array.isArray(list) && list.length > 0 ? list : MOCK_BOTS);
        }
      } catch {
        if (!cancelled) {
          setIsDemo(true);
          setBots(MOCK_BOTS);
        }
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
      <div className="sf-card rounded-2xl overflow-hidden mb-8 relative min-h-[7.5rem]">
        <img src="/images/bots/bot-card-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        <div className="relative z-10 flex items-end min-h-[7.5rem] px-6 py-5 bg-gradient-to-t from-[--bg-primary]/90 to-transparent">
          <div>
            <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight drop-shadow-sm">导师机器人</h1>
            <p className="text-[13px] text-[--text-secondary] mt-0.5">选择学科与机器人，开始个性化辅导</p>
          </div>
        </div>
      </div>

      {isDemo && (
        <div
          className="mb-6 rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 px-4 py-2.5 text-sm text-[#6b5a3a] dark:text-amber-100/90 shadow-[0_0_0_1px_rgba(217,180,100,0.35)]"
          role="status"
        >
          无法连接服务器，当前显示演示数据
        </div>
      )}

      <p className="text-[13px] uppercase tracking-[0.2em] text-[--text-muted] mb-3">筛选</p>
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setFilter("")}
          className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
            filter === ""
              ? "bg-[--accent]/12 text-[--accent] shadow-[0_0_0_1px_rgba(201,100,66,0.35)]"
              : "bg-[--chip-bg] text-[--text-secondary] shadow-[0_0_0_1px_var(--chip-border)] hover:bg-[--chip-hover-bg]"
          }`}
        >
          全部
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all ${
              filter === t
                ? "bg-[--accent]/12 text-[--accent] shadow-[0_0_0_1px_rgba(201,100,66,0.35)]"
                : "bg-[--chip-bg] text-[--text-secondary] shadow-[0_0_0_1px_var(--chip-border)] hover:bg-[--chip-hover-bg]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4 animate-pulse" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sf-card rounded-2xl p-5 flex flex-col">
              <div className="w-full h-36 rounded-2xl mb-4 sf-skeleton" />
              <div className="sf-skeleton h-4 w-2/3 mb-3" />
              <div className="sf-skeleton h-3 w-full mb-2" />
              <div className="sf-skeleton h-3 w-4/5 mb-3" />
              <div className="flex flex-wrap gap-2 mt-1">
                <div className="sf-skeleton h-5 w-12 rounded-full" />
                <div className="sf-skeleton h-5 w-14 rounded-full" />
              </div>
              <div className="sf-skeleton h-3 w-1/2 mt-3" />
              <div className="sf-skeleton h-10 w-full rounded-full mt-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((b, i) => (
            <article
              key={b.id}
              className="sf-card rounded-2xl p-5 flex flex-col"
            >
              <div
                className="w-full h-36 rounded-2xl mb-4 overflow-hidden relative"
                style={{ background: "linear-gradient(135deg, rgba(201,100,66,0.08), rgba(107,168,154,0.1))" }}
              >
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full bg-[color-mix(in_srgb,var(--bg-primary)_70%,transparent)] shadow-[0_0_0_1px_rgba(208,205,195,0.35),0_8px_24px_rgba(0,0,0,0.06)] flex items-center justify-center">
                  <img
                    src={b.avatar || BOT_AVATARS[i % BOT_AVATARS.length]}
                    alt={b.name}
                    className="h-24 w-24 object-contain"
                  />
                </div>
              </div>
              <h2 className="text-[17px] font-semibold text-[--text-primary] tracking-tight">{b.name}</h2>
              <p className="text-[13px] text-[--text-secondary] mt-1.5 leading-relaxed flex-1">{b.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {b.subject_tags.map((t) => (
                  <span key={t} className="sf-badge text-[11px] py-0.5 px-2.5">
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
                className="sf-btn-primary mt-4 w-full rounded-full py-2.5 text-[14px]"
              >
                开始对话
              </button>
            </article>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="sf-card rounded-2xl p-12 text-center">
          <p className="text-[15px] text-[--text-secondary]">该标签下暂无机器人</p>
        </div>
      )}

      <p className="mt-8 text-center text-[13px] text-[--text-muted]">
        <Link href="/chat" className="text-[--accent] font-medium hover:underline underline-offset-2">
          查看我的对话
        </Link>
      </p>
    </div>
  );
}
