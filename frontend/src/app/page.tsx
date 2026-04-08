"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-store";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import type { TutorBotSummary } from "@/lib/tutor-types";
import { IconBook, IconBot, IconCpu, IconMoon, IconSparkles, IconSun } from "@/components/ui-icons";
import {
  AnimatedTitle,
  CountUp,
  FadeInSection,
  FloatingCard,
  GradientText,
  TextReveal,
  TypewriterText,
} from "@/components/TextEffects";

const FEATURES = [
  {
    title: "智能对话",
    desc: "与 TutorBot 自然交流，随时答疑。",
    Icon: IconSparkles,
    accent: "from-blue-500/25 to-indigo-500/20",
  },
  {
    title: "深度解题",
    desc: "分步推理与考点拆解。",
    Icon: IconCpu,
    accent: "from-violet-500/25 to-purple-500/20",
  },
  {
    title: "测验模式",
    desc: "自测与知识点巩固。",
    Icon: IconBook,
    accent: "from-fuchsia-500/25 to-pink-500/20",
  },
  {
    title: "研究与写作",
    desc: "资料整理与文稿辅助。",
    Icon: IconBot,
    accent: "from-cyan-500/25 to-blue-500/20",
  },
] as const;

const STATS = [
  { label: "活跃学习者", end: 12800, suffix: "+" },
  { label: "精品课程", end: 420, suffix: "+" },
  { label: "累计答疑", end: 960000, suffix: "+" },
] as const;

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

const HERO_TAGLINE =
  "将课程、题库与教研资料融为一体，为学生提供对话式辅导与深度学习体验。";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.94 }}
      aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
      className="w-10 h-10 rounded-full flex items-center justify-center sf-card hover:scale-105"
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
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[min(100vw,780px)] h-[min(60vh,520px)] rounded-full blur-[100px] opacity-40 dark:opacity-50"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.45), rgba(168,85,247,0.35), rgba(236,72,153,0.25))" }}
          animate={{ scale: [1, 1.06, 1], opacity: [0.32, 0.48, 0.32] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-25%] right-[-20%] w-[420px] h-[420px] rounded-full blur-[90px] opacity-30 dark:opacity-40"
          style={{ background: "linear-gradient(200deg, rgba(236,72,153,0.4), rgba(99,102,241,0.25))" }}
          animate={{ scale: [1, 1.12, 1], x: [0, -12, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <div
          className="absolute inset-0 dark:hidden opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59,130,246,0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(236,72,153,0.08), transparent)",
          }}
        />
      </div>

      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <span className="text-[17px] font-semibold tracking-tight">
          Xin <GradientText>AI</GradientText>
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <motion.button
              type="button"
              onClick={() => router.push("/chat")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[13px] font-medium shadow-lg shadow-blue-500/25"
            >
              进入平台
            </motion.button>
          ) : (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-[13px] font-medium no-underline inline-flex items-center shadow-lg shadow-blue-500/25"
              >
                登录
              </Link>
            </motion.div>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-24 sm:pb-32">
        <section className="pt-8 sm:pt-16 text-center max-w-3xl mx-auto">
          <FadeInSection>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[--border-subtle] bg-[--bg-card]/70 backdrop-blur-xl text-[12px] sm:text-[13px] text-[--text-secondary] mb-8">
              <IconSparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
              <span>
                <GradientText>智能教学</GradientText>
                <span className="mx-1">·</span>
                知识库驱动
              </span>
            </div>
          </FadeInSection>

          <AnimatedTitle
            text="Xin AI 智能教学平台"
            className="text-[clamp(1.75rem,5vw,3.25rem)] font-semibold tracking-tight leading-[1.15] text-[--text-primary]"
          />

          <p className="mt-4 text-lg sm:text-xl text-[--text-secondary] font-medium">
            <GradientText>个性化学习</GradientText>
            <span className="mx-2 text-[--text-muted]">·</span>
            导师机器人
          </p>

          <div className="mt-8 min-h-[4.5rem] sm:min-h-[5rem] max-w-2xl mx-auto text-[15px] sm:text-[16px] text-[--text-secondary] leading-relaxed px-2">
            <TypewriterText text={HERO_TAGLINE} speed={28} />
          </div>

          <motion.div
            className="mt-12 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <motion.button
              type="button"
              onClick={() => router.push(user ? "/chat" : "/login")}
              className="px-8 py-3.5 rounded-2xl text-white text-[15px] font-medium bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 shadow-xl shadow-purple-500/30"
              animate={{
                boxShadow: [
                  "0 20px 50px -12px rgba(147, 51, 234, 0.45)",
                  "0 24px 60px -10px rgba(59, 130, 246, 0.5)",
                  "0 20px 50px -12px rgba(147, 51, 234, 0.45)",
                ],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {user ? "开始使用" : "立即开始"}
            </motion.button>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-2xl sf-glass text-[15px] font-medium text-[--text-primary] no-underline text-center inline-flex items-center justify-center border border-[--border-subtle] hover:border-blue-500/30 transition-colors"
            >
              {user ? "账号设置" : "登录 / 注册"}
            </Link>
          </motion.div>
        </section>

        <section className="mt-24 sm:mt-32">
          <FadeInSection className="text-center mb-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[--text-muted]">数据亮点</h2>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {STATS.map((s, i) => (
              <FadeInSection key={s.label} delay={i * 0.08}>
                <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-card]/60 backdrop-blur-xl px-6 py-8 text-center">
                  <p className="text-3xl sm:text-4xl font-semibold tabular-nums bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                    <CountUp end={s.end} duration={2.2} suffix={s.suffix} />
                  </p>
                  <p className="mt-2 text-[13px] text-[--text-secondary]">{s.label}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </section>

        <section className="mt-24 sm:mt-32">
          <FadeInSection className="text-center mb-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-[--text-primary]">精选 TutorBot</h2>
          </FadeInSection>
          <FadeInSection delay={0.06} className="text-center mb-10">
            <p className="text-[13px] sm:text-[14px] text-[--text-muted] max-w-xl mx-auto">
              {user ? "已登录，展示来自平台的推荐" : "预览示例卡片，登录后同步真实数据"}
            </p>
          </FadeInSection>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
            {displayBots.map((b, i) => (
              <FloatingCard key={b.id} delay={i * 0.12}>
                <article className="sf-card rounded-2xl p-5 sm:p-6 text-left h-full border border-[--border-subtle] bg-[--bg-card]/80 backdrop-blur-xl hover:border-purple-500/25 transition-colors">
                  <div
                    className={`h-28 rounded-xl mb-4 bg-gradient-to-br ${
                      i % 3 === 0
                        ? "from-blue-500/30 to-purple-500/25"
                        : i % 3 === 1
                          ? "from-emerald-500/25 to-teal-500/25"
                          : "from-orange-500/25 to-pink-500/30"
                    }`}
                  />
                  <h3 className="text-[16px] font-semibold text-[--text-primary]">{b.name}</h3>
                  <p className="text-[13px] text-[--text-secondary] mt-1 line-clamp-2 leading-relaxed">{b.description}</p>
                  <p className="text-[11px] text-[--text-muted] mt-3">{b.teacher_name}</p>
                </article>
              </FloatingCard>
            ))}
          </div>
        </section>

        <section className="mt-24 sm:mt-32">
          <FadeInSection className="text-center mb-12">
            <h2 className="text-xl sm:text-2xl font-semibold text-[--text-primary]">能力亮点</h2>
            <p className="mt-2 text-[14px] text-[--text-secondary]">为教学场景打造的流畅体验</p>
          </FadeInSection>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
            {FEATURES.map((f, i) => (
              <FadeInSection key={f.title} delay={i * 0.06}>
                <FloatingCard delay={i * 0.08}>
                  <div className="rounded-2xl border border-[--border-subtle] bg-[--bg-card]/70 backdrop-blur-xl p-6 sm:p-7 h-full group">
                    <motion.div
                      className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} border border-white/10`}
                      whileHover={{ scale: 1.08, rotate: -4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                      <f.Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                    <h3 className="text-[16px] font-semibold text-[--text-primary]">{f.title}</h3>
                    <p className="text-[13px] sm:text-[14px] text-[--text-secondary] mt-2 leading-relaxed">{f.desc}</p>
                  </div>
                </FloatingCard>
              </FadeInSection>
            ))}
          </div>
        </section>

        <section className="mt-24 sm:mt-32 rounded-3xl border border-[--border-subtle] bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/15 dark:via-purple-500/10 dark:to-pink-500/15 px-6 py-14 sm:px-12 sm:py-16 text-center backdrop-blur-xl overflow-hidden relative">
          <div className="pointer-events-none absolute inset-0 bg-[--bg-primary]/40" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <AnimatedTitle
              as="h2"
              text="准备好升级你的课堂了吗？"
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-[--text-primary] leading-tight"
            />
            <TextReveal
              text="加入 Xin AI，用对话式 AI 连接每一名学生。\n从备课到答疑，全流程加速。"
              className="mt-4 text-[15px] text-[--text-secondary] max-w-md mx-auto text-center"
            />
            <motion.div
              className="mt-10 flex justify-center"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.button
                type="button"
                onClick={() => router.push(user ? "/chat" : "/login")}
                className="px-10 py-4 rounded-2xl text-white text-[15px] font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 shadow-lg shadow-purple-500/35"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                {user ? "进入对话" : "免费开始"}
              </motion.button>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
