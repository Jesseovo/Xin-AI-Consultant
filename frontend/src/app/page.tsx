"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import type { TutorBotSummary } from "@/lib/tutor-types";
import { IconMoon, IconSparkles, IconSun } from "@/components/ui-icons";

const FEATURES = [
  { title: "智能对话", desc: "与 TutorBot 自然交流，随时答疑。" },
  { title: "深度解题", desc: "分步推理与考点拆解。" },
  { title: "测验模式", desc: "自测与知识点巩固。" },
  { title: "研究与写作", desc: "资料整理与文稿辅助。" },
];

const PLACEHOLDER_BOTS: TutorBotSummary[] = [
  {
    id: "p1",
    name: "示例 · 高数助教",
    description: "微积分与线性代数辅导演示。",
    subject_tags: ["数学"],
    teacher_name: "示例教师",
    usage_count: 0,
  },
  {
    id: "p2",
    name: "示例 · 编程导师",
    description: "算法与编程入门演示。",
    subject_tags: ["编程"],
    teacher_name: "示例教师",
    usage_count: 0,
  },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
      className="w-10 h-10 rounded-full flex items-center justify-center sf-card hover:scale-105"
    >
      {theme === "dark" ? (
        <IconSun className="w-[18px] h-[18px] text-[--text-secondary]" />
      ) : (
        <IconMoon className="w-[18px] h-[18px] text-[--text-secondary]" />
      )}
    </button>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { user, ready, accessToken } = useAuth();
  const [featured, setFeatured] = useState<TutorBotSummary[]>([]);

  const loadFeatured = useCallback(async () => {
    try {
      if (accessToken) api.setToken(accessToken);
      const res = await api.get<{ items?: TutorBotSummary[]; bots?: TutorBotSummary[] }>("/bots/featured");
      const list = res.items ?? res.bots ?? [];
      setFeatured(Array.isArray(list) && list.length > 0 ? list.slice(0, 3) : []);
    } catch {
      setFeatured([]);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!ready) return;
    if (user) void loadFeatured();
    else setFeatured([]);
  }, [ready, user, loadFeatured]);

  const displayBots = featured.length > 0 ? featured : PLACEHOLDER_BOTS;

  return (
    <div className="min-h-screen bg-[--bg-primary] text-[--text-primary] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full blur-[120px]" style={{ background: "var(--ambient-a)" }} />
        <div className="absolute bottom-[-20%] right-[-15%] w-[420px] h-[420px] rounded-full blur-[100px]" style={{ background: "var(--ambient-b)" }} />
      </div>

      <header className="relative z-10 max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-[17px] font-semibold tracking-tight">Xin AI</span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="px-4 py-2 rounded-full bg-[--accent] text-white text-[13px] font-medium"
            >
              进入平台
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-full bg-[--accent] text-white text-[13px] font-medium no-underline inline-flex items-center"
            >
              登录
            </Link>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 pb-20">
        <section className="pt-10 sm:pt-16 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full sf-glass text-[12px] text-[--text-secondary] mb-6">
            <IconSparkles className="w-4 h-4 text-[--accent]" />
            智能教学平台
          </div>
          <h1 className="text-[34px] sm:text-[44px] font-semibold tracking-tight leading-tight">
            Xin AI
            <span className="block text-[20px] sm:text-[22px] font-normal text-[--text-secondary] mt-2">
              个性化学习 · 导师机器人 · 知识库驱动
            </span>
          </h1>
          <p className="mt-5 text-[15px] sm:text-[16px] text-[--text-secondary] leading-relaxed">
            将课程、题库与教研资料融为一体，为学生提供对话式辅导与深度学习体验。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push(user ? "/chat" : "/login")}
              className="px-8 py-3.5 rounded-2xl bg-[--accent] text-white text-[15px] font-medium shadow-lg shadow-[--accent]/20"
            >
              {user ? "开始使用" : "立即开始"}
            </button>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-2xl sf-card text-[15px] font-medium text-[--text-primary] no-underline text-center inline-flex items-center justify-center"
            >
              {user ? "账号设置" : "登录 / 注册"}
            </Link>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-[18px] font-semibold text-center mb-2">精选 TutorBot</h2>
          <p className="text-[13px] text-[--text-muted] text-center mb-8">
            {user ? "已登录，展示来自平台的推荐" : "预览示例卡片，登录后同步真实数据"}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {displayBots.map((b, i) => (
              <article key={b.id} className="sf-card rounded-2xl p-5 text-left hover:scale-[1.02]">
                <div
                  className={`h-28 rounded-xl mb-4 bg-gradient-to-br ${
                    i % 3 === 0 ? "from-blue-500/20 to-purple-500/20" : i % 3 === 1 ? "from-emerald-500/20 to-teal-500/20" : "from-orange-500/20 to-pink-500/20"
                  }`}
                />
                <h3 className="text-[16px] font-semibold text-[--text-primary]">{b.name}</h3>
                <p className="text-[13px] text-[--text-secondary] mt-1 line-clamp-2">{b.description}</p>
                <p className="text-[11px] text-[--text-muted] mt-3">{b.teacher_name}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <h2 className="text-[18px] font-semibold text-center mb-10">能力亮点</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="sf-glass rounded-2xl p-6">
                <h3 className="text-[15px] font-medium text-[--text-primary]">{f.title}</h3>
                <p className="text-[13px] text-[--text-secondary] mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
