"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface QuizSummary {
  id: number;
  title: string;
  created_at: string | null;
  question_count: number;
}

const QUESTION_TYPES = [
  { id: "choice", label: "选择题" },
  { id: "true_false", label: "判断题" },
  { id: "fill_blank", label: "填空题" },
];

const MOCK_QUIZZES: QuizSummary[] = [
  { id: -1, title: "数据结构基础测验", created_at: "2026-04-01T10:00:00", question_count: 5 },
  { id: -2, title: "操作系统概念回顾", created_at: "2026-03-28T14:30:00", question_count: 8 },
];

export default function QuizPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const [topic, setTopic] = useState("");
  const [numQ, setNumQ] = useState(5);
  const [types, setTypes] = useState<string[]>(["choice", "true_false", "fill_blank"]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    try {
      const res = await api.get<QuizSummary[]>("/quiz/");
      setQuizzes(Array.isArray(res) ? res : []);
      setIsDemo(false);
    } catch {
      setQuizzes(MOCK_QUIZZES);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQuizzes(); }, [loadQuizzes]);

  const toggleType = (id: string) => {
    setTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    const t = topic.trim();
    if (!t) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post<{ id: number }>("/quiz/generate", {
        topic: t,
        num_questions: numQ,
        question_types: types.length > 0 ? types : ["choice"],
      });
      if (res?.id) {
        router.push(`/quiz/${res.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">测验</h1>
        <p className="text-[13px] text-[--text-secondary] mt-0.5">输入主题，AI 自动出题并批改</p>
      </div>

      {isDemo && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
          无法连接后端，当前为演示模式
        </div>
      )}

      {/* Generate form */}
      <div className="sf-card rounded-2xl p-6 mb-8 border border-[--border-subtle]">
        <h2 className="text-[16px] font-semibold text-[--text-primary] mb-4">生成新测验</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">测验主题</label>
            <input
              className="sf-input w-full px-4 py-3 text-[15px]"
              placeholder="例：数据结构中的排序算法"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleGenerate(); }}
            />
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">题目数量</label>
              <select
                className="sf-input px-3 py-2.5 text-[14px]"
                value={numQ}
                onChange={(e) => setNumQ(Number(e.target.value))}
              >
                {[3, 5, 8, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n} 题</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">题型</label>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((qt) => (
                  <button
                    key={qt.id}
                    type="button"
                    onClick={() => toggleType(qt.id)}
                    className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                      types.includes(qt.id)
                        ? "bg-[--accent]/15 border-[--accent]/40 text-[--accent]"
                        : "border-[--chip-border] bg-[--chip-bg] text-[--text-secondary]"
                    }`}
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && (
            <div className="text-[13px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || !topic.trim()}
            className="px-6 py-2.5 rounded-xl bg-[--accent] text-[--accent-text] text-[14px] font-medium disabled:opacity-40 transition-opacity"
          >
            {generating ? "生成中…" : "生成测验"}
          </button>
        </div>
      </div>

      {/* Quiz list */}
      <h2 className="text-[16px] font-semibold text-[--text-primary] mb-4">历史测验</h2>
      {loading ? (
        <p className="text-[14px] text-[--text-muted]">加载中…</p>
      ) : quizzes.length === 0 ? (
        <div className="sf-card rounded-2xl p-8 text-center border border-[--border-subtle]">
          <img src="/images/modes/quiz.png" alt="" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <p className="text-[14px] text-[--text-secondary]">还没有测验，输入主题生成第一份吧</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {quizzes.map((q) => (
            <Link
              key={q.id}
              href={q.id > 0 ? `/quiz/${q.id}` : "#"}
              className="sf-card rounded-xl px-5 py-4 flex items-center justify-between border border-[--border-subtle] hover:border-[--accent]/25 transition-colors no-underline"
            >
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-[--text-primary] truncate">{q.title}</h3>
                <p className="text-[12px] text-[--text-muted] mt-0.5">
                  {q.question_count} 题
                  {q.created_at && ` · ${new Date(q.created_at).toLocaleDateString("zh-CN")}`}
                </p>
              </div>
              <span className="text-[13px] text-[--accent] shrink-0 ml-4">查看</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
