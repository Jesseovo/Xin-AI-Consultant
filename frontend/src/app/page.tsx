"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import type { TutorBotSummary } from "@/lib/tutor-types";
import { IconMoon, IconSun } from "@/components/ui-icons";
import {
  BreathingText,
  CountUp,
  FadeInSection,
  GradientText,
  TypewriterText,
} from "@/components/TextEffects";

const FEATURES = [
  { title: "智能对话", desc: "与 TutorBot 自然交流，随时答疑。", img: "/images/modes/chat.png" },
  { title: "深度解题", desc: "分步推理与考点拆解。", img: "/images/modes/deep-solve.png" },
  { title: "测验模式", desc: "自测与知识点巩固。", img: "/images/modes/quiz.png" },
  { title: "深度研究", desc: "文献检索与资料整理。", img: "/images/modes/deep-research.png" },
  { title: "引导式学习", desc: "分步计划与知识展开。", img: "/images/modes/guided.png" },
  { title: "笔记本", desc: "整理和管理学习笔记。", img: "/images/modes/notebook.png" },
  { title: "知识库", desc: "文档向量化与智能检索。", img: "/images/modes/knowledge.png" },
] as const;

const STATS = [
  { label: "活跃学习者", end: 12800, suffix: "+" },
  { label: "精品课程", end: 420, suffix: "+" },
  { label: "累计答疑", end: 960000, suffix: "+" },
] as const;

const PLACEHOLDER_BOTS: TutorBotSummary[] = [
  { id: "p1", name: "示例 · 高数助教", description: "微积分与线性代数辅导演示。", subject_tags: ["数学"], teacher_name: "示例教师", usage_count: 0, avatar: "/images/bots/math-bot.png" },
  { id: "p2", name: "示例 · 编程导师", description: "算法与编程入门演示。", subject_tags: ["编程"], teacher_name: "示例教师", usage_count: 0, avatar: "/images/bots/code-bot.png" },
  { id: "p3", name: "示例 · 英语陪练", description: "写作、口语与四六级备考策略。", subject_tags: ["英语"], teacher_name: "示例教师", usage_count: 0, avatar: "/images/bots/english-bot.png" },
];

const HERO_TAGLINE = "将课程、题库与教研资料融为一体，为学生提供对话式辅导与深度学习体验。";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.94 }}
      aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
      className="w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_0_1px_var(--chip-border)] hover:bg-[--bg-card-hover] transition-colors"
    >
      {theme === "dark" ? (
        <IconSun className="w-[18px] h-[18px] text-[--text-secondary]" />
      ) : (
        <IconMoon className="w-[18px] h-[18px] text-[--text-secondary]" />
      )}
    </motion.button>
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
      {/* Ambient orbs — terracotta + teal */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-[-18%] left-1/2 -translate-x-1/2 w-[min(100vw,820px)] h-[min(58vh,540px)] rounded-full blur-[100px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(201, 100, 66, 0.25), rgba(107, 168, 154, 0.15), rgba(201, 100, 66, 0.12))",
          }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.38, 0.52, 0.38] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/images/platform/logo.png" alt="夹心" className="w-8 h-8 object-contain" />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">
            夹心 <GradientText>AI</GradientText>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <motion.button
            type="button"
            onClick={() => router.push(user ? "/chat" : "/login")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="sf-btn-primary px-5 py-2.5 rounded-full text-[13px] font-semibold"
          >
            {user ? "进入平台" : "登录"}
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        {/* Hero — cinematic, full-viewport feel */}
        <section className="min-h-[min(88svh,920px)] flex flex-col justify-center pt-6 sm:pt-10 pb-4 text-center max-w-4xl mx-auto w-full">
          <FadeInSection>
            <div className="sf-badge text-[12px] sm:text-[13px] text-[--text-secondary] mb-8">
              <img src="/images/platform/logo.png" alt="" className="w-4 h-4 object-contain shrink-0" />
              <BreathingText text="智能教学 · 知识库驱动" />
            </div>
          </FadeInSection>

          <h1 className="text-[clamp(1.85rem,5.2vw,3.35rem)] font-semibold tracking-[-0.02em] leading-[1.07] text-[--text-primary]">
            <BreathingText text="夹心智能教学平台" />
          </h1>

          <p className="mt-5 text-lg sm:text-xl font-medium tracking-[-0.02em] leading-[1.65]">
            <BreathingText text="个性化学习 · 导师机器人" className="text-[--text-secondary]" />
          </p>

          <div className="mt-7 min-h-[4.5rem] sm:min-h-[5rem] max-w-2xl mx-auto text-[15px] sm:text-[16px] text-[--text-secondary] leading-[1.65] px-2">
            <TypewriterText text={HERO_TAGLINE} speed={28} />
          </div>

          {/* Hero image */}
          <FadeInSection delay={0.3}>
            <div className="mt-10 max-w-3xl mx-auto rounded-[20px] overflow-hidden sf-glow relative after:absolute after:inset-0 after:z-[2] after:pointer-events-none after:content-[''] after:bg-gradient-to-t after:from-[--bg-primary] after:via-[--bg-primary]/12 after:to-transparent sm:after:bg-gradient-to-br sm:after:from-[--bg-primary]/30 sm:after:via-transparent sm:after:to-[rgba(107,168,154,0.06)]">
              <img
                src="/images/platform/hero.png"
                alt="夹心智能教学平台"
                className="hidden sm:block relative z-[1] w-full h-auto object-cover [mask-image:linear-gradient(to_bottom,black_82%,rgba(245,244,237,0.92)_100%)]"
              />
              <img
                src="/images/platform/hero-mobile.png"
                alt="夹心智能教学平台"
                className="sm:hidden relative z-[1] w-full h-auto object-cover [mask-image:linear-gradient(to_bottom,black_78%,rgba(245,244,237,0.95)_100%)]"
              />
            </div>
          </FadeInSection>

          {/* CTA buttons */}
          <motion.div
            className="mt-12 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <motion.button
              type="button"
              onClick={() => router.push(user ? "/chat" : "/login")}
              className="sf-btn-primary px-8 py-3.5 rounded-full text-[15px] font-semibold"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {user ? "进入平台" : "立即开始"}
            </motion.button>
            {!user && (
              <Link
                href="/login"
                className="sf-btn-secondary px-8 py-3.5 rounded-full text-[15px] font-semibold no-underline text-center inline-flex items-center justify-center transition-shadow"
              >
                登录 / 注册
              </Link>
            )}
          </motion.div>
        </section>

        {/* Stats */}
        <section className="mt-28 sm:mt-36">
          <FadeInSection className="text-center mb-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[--text-muted]">
              <BreathingText text="数据亮点" />
            </h2>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
            {STATS.map((s, i) => (
              <FadeInSection key={s.label} delay={i * 0.08}>
                <div className="sf-card px-6 py-9 text-center">
                  <p className="text-3xl sm:text-4xl font-bold tabular-nums bg-gradient-to-br from-[--accent] via-[--accent-hover] to-[--accent-secondary] bg-clip-text text-transparent">
                    <CountUp end={s.end} duration={2.2} suffix={s.suffix} />
                  </p>
                  <p className="mt-3 text-[13px] text-[--text-secondary] leading-[1.6]">{s.label}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </section>

        {/* TutorBots */}
        <section className="mt-28 sm:mt-36">
          <FadeInSection className="text-center mb-3">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-[--text-primary]">
              <BreathingText text="精选 TutorBot" />
            </h2>
          </FadeInSection>
          <FadeInSection delay={0.06} className="text-center mb-12">
            <p className="text-[13px] sm:text-[14px] text-[--text-muted] max-w-xl mx-auto leading-[1.65]">
              {user ? "已登录，展示来自平台的推荐" : "预览示例卡片，登录后同步真实数据"}
            </p>
          </FadeInSection>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {displayBots.map((b) => (
              <article key={b.id} className="sf-card p-5 sm:p-6 text-left h-full flex flex-col">
                <div className="h-28 rounded-[14px] mb-4 overflow-hidden relative bg-[#faf9f5] dark:bg-[rgba(250,249,245,0.06)] shadow-[inset_0_0_0_1px_rgba(208,205,195,0.2)]">
                  <img
                    src={b.avatar || "/images/bots/default-bot.png"}
                    alt={b.name}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-24 w-24 object-contain"
                  />
                </div>
                <h3 className="text-[16px] font-semibold tracking-[-0.02em] text-[--text-primary]">
                  <BreathingText text={b.name} />
                </h3>
                <p className="text-[13px] text-[--text-secondary] mt-1.5 line-clamp-2 leading-[1.65]">{b.description}</p>
                <p className="text-[11px] text-[--text-muted] mt-auto pt-4">{b.teacher_name}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mt-28 sm:mt-36">
          <FadeInSection className="text-center mb-14">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-[--text-primary]">
              <BreathingText text="能力亮点" />
            </h2>
            <p className="mt-3 text-[14px] text-[--text-secondary] leading-[1.65]">
              <BreathingText text="为教学场景打造的流畅体验" />
            </p>
          </FadeInSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 0.06}>
                <div className="group relative sf-card sf-shimmer p-4 sm:p-5 h-full text-center overflow-hidden transition-[transform,box-shadow] duration-300 ease-out">
                  <div
                    className="w-12 h-12 mx-auto mb-3.5 rounded-full flex items-center justify-center p-2.5 shadow-[0_0_0_1px_rgba(208,205,195,0.22)]"
                    style={{
                      background:
                        "linear-gradient(145deg, rgba(201, 100, 66, 0.09), rgba(107, 168, 154, 0.08))",
                    }}
                  >
                    <img src={f.img} alt={f.title} className="w-7 h-7 object-contain transition-transform duration-300 ease-out group-hover:scale-110" />
                  </div>
                  <h3 className="text-[14px] font-bold tracking-[-0.02em] text-[--text-primary]">{f.title}</h3>
                  <p className="text-[12px] text-[--text-secondary] mt-1.5 leading-[1.65]">{f.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-28 sm:mt-36">
          <div className="sf-gradient-border px-8 py-16 sm:px-14 sm:py-20 text-center rounded-[24px]">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-[1.75rem] md:text-3xl font-semibold tracking-[-0.02em] text-[--text-primary] leading-[1.15]">
                <BreathingText text="准备好升级你的课堂了吗？" />
              </h2>
              <p className="mt-5 text-[15px] sm:text-[16px] text-[--text-secondary] max-w-md mx-auto leading-[1.65]">
                <BreathingText text="加入夹心，用对话式 AI 连接每一名学生。" />
              </p>
              <div className="mt-12 flex justify-center">
                <motion.button
                  type="button"
                  onClick={() => router.push(user ? "/chat" : "/login")}
                  className="sf-btn-primary px-10 py-4 rounded-full text-[15px] font-semibold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {user ? "进入对话" : "免费开始"}
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
