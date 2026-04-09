"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface Question {
  type: string;
  question: string;
  options?: string[];
  answer?: string;
}

interface GradingResult {
  question: string;
  your_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string;
}

interface QuizDetail {
  id: number;
  title: string;
  questions: Question[];
  created_at: string | null;
}

const MOCK_QUIZ: QuizDetail = {
  id: -1,
  title: "数据结构基础测验（演示）",
  created_at: "2026-04-01T10:00:00",
  questions: [
    { type: "choice", question: "以下哪种数据结构遵循先进后出(LIFO)原则？", options: ["队列", "栈", "链表", "哈希表"], answer: "栈" },
    { type: "true_false", question: "二叉搜索树的中序遍历结果一定是有序的。", answer: "正确" },
    { type: "fill_blank", question: "完全二叉树中，第 k 层最多有 ___ 个节点。", answer: "2^(k-1)" },
    { type: "choice", question: "以下排序算法中，平均时间复杂度为 O(n log n) 的是？", options: ["冒泡排序", "插入排序", "快速排序", "选择排序"], answer: "快速排序" },
    { type: "true_false", question: "图的深度优先搜索(DFS)使用队列作为辅助数据结构。", answer: "错误" },
  ],
};

export default function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const router = useRouter();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [results, setResults] = useState<GradingResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(async () => {
    try {
      const res = await api.get<QuizDetail>(`/quiz/${quizId}`);
      setQuiz(res);
      setIsDemo(false);
    } catch {
      setQuiz(MOCK_QUIZ);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => { void loadQuiz(); }, [loadQuiz]);

  const setAnswer = (idx: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [idx]: value }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);

    const payload = quiz.questions.map((_, i) => ({
      question_index: i,
      answer: answers[i] || "",
    }));

    if (isDemo) {
      const mockResults = quiz.questions.map((q, i) => ({
        question: q.question,
        your_answer: answers[i] || "（未作答）",
        correct_answer: q.answer || "",
        is_correct: (answers[i] || "").trim() === (q.answer || "").trim(),
        explanation: "这是演示模式下的自动批改。",
      }));
      const correct = mockResults.filter((r) => r.is_correct).length;
      setScore(correct);
      setTotal(mockResults.length);
      setResults(mockResults);
      setSubmitted(true);
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post<{
        score: number;
        total: number;
        results: GradingResult[];
      }>(`/quiz/${quizId}/submit`, { answers: payload });
      setScore(res.score);
      setTotal(res.total);
      setResults(res.results || []);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-[14px] text-[--text-muted] text-center">加载测验中…</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-[15px] text-[--text-secondary]">测验不存在</p>
        <button onClick={() => router.push("/quiz")} className="mt-4 text-[--accent] text-[14px]">返回列表</button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length;
  const totalQ = quiz.questions.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push("/quiz")} className="text-[13px] text-[--accent] mb-3 inline-block hover:underline">
          ← 返回测验列表
        </button>
        <h1 className="text-[20px] font-semibold text-[--text-primary] tracking-tight">{quiz.title}</h1>
        <p className="text-[13px] text-[--text-secondary] mt-1">
          共 {totalQ} 题
          {quiz.created_at && ` · ${new Date(quiz.created_at).toLocaleDateString("zh-CN")}`}
        </p>
      </div>

      {isDemo && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
          演示模式 — 后端不可用，使用本地示例题目
        </div>
      )}

      {/* Score banner */}
      {submitted && score !== null && total !== null && (
        <div className="mb-6 rounded-2xl p-6 text-center border border-[--border-subtle]"
          style={{ background: "linear-gradient(135deg, var(--ambient-a) 0%, var(--bg-card) 100%)" }}
        >
          <p className="text-[14px] text-[--text-secondary] mb-1">得分</p>
          <p className="text-[36px] font-bold text-[--accent]">
            {score}<span className="text-[18px] text-[--text-muted] font-normal"> / {total}</span>
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {quiz.questions.map((q, i) => {
          const resultItem = submitted ? results[i] : null;
          const isCorrect = resultItem?.is_correct;
          return (
            <div
              key={i}
              className={`sf-card rounded-xl p-5 border transition-colors ${
                submitted
                  ? isCorrect
                    ? "border-emerald-300 dark:border-emerald-700"
                    : "border-red-300 dark:border-red-700"
                  : "border-[--border-subtle]"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[--accent]/10 text-[--accent] text-[13px] font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <span className="inline-block text-[11px] font-medium text-[--text-muted] bg-[--bg-card] px-2 py-0.5 rounded mb-1.5">
                    {q.type === "choice" ? "选择" : q.type === "true_false" ? "判断" : "填空"}
                  </span>
                  <p className="text-[15px] text-[--text-primary] leading-relaxed">{q.question}</p>
                </div>
              </div>

              {/* Answer area */}
              <div className="pl-10">
                {q.type === "choice" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[i] === opt;
                      return (
                        <label
                          key={oi}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                            selected
                              ? "border-[--accent]/40 bg-[--accent]/8"
                              : "border-[--border-subtle] hover:border-[--accent]/20"
                          } ${submitted ? "pointer-events-none opacity-80" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`q-${i}`}
                            value={opt}
                            checked={selected}
                            onChange={() => setAnswer(i, opt)}
                            disabled={submitted}
                            className="accent-[--accent]"
                          />
                          <span className="text-[14px] text-[--text-primary]">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : q.type === "true_false" ? (
                  <div className="flex gap-3">
                    {["正确", "错误"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswer(i, v)}
                        disabled={submitted}
                        className={`px-5 py-2 rounded-lg border text-[14px] transition-colors ${
                          answers[i] === v
                            ? "border-[--accent]/40 bg-[--accent]/10 text-[--accent]"
                            : "border-[--border-subtle] text-[--text-secondary] hover:border-[--accent]/20"
                        } ${submitted ? "opacity-80" : ""}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    className="sf-input w-full px-3 py-2.5 text-[14px] border border-[--border-subtle]"
                    placeholder="输入答案…"
                    value={answers[i] || ""}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    disabled={submitted}
                  />
                )}

                {/* Feedback */}
                {resultItem && (
                  <div className={`mt-3 rounded-lg px-3 py-2.5 text-[13px] ${
                    isCorrect
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  }`}>
                    <p className="font-medium">{isCorrect ? "✓ 正确" : "✗ 错误"}</p>
                    {!isCorrect && (
                      <p className="mt-0.5">正确答案：{resultItem.correct_answer}</p>
                    )}
                    {resultItem.explanation && (
                      <p className="mt-1 text-[12px] opacity-80">{resultItem.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit / Back */}
      <div className="mt-8 flex items-center gap-4">
        {!submitted ? (
          <>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || answeredCount === 0}
              className="px-6 py-2.5 rounded-xl bg-[--accent] text-white text-[14px] font-medium disabled:opacity-40 transition-opacity"
            >
              {submitting ? "提交中…" : `提交答案 (${answeredCount}/${totalQ})`}
            </button>
            {error && (
              <span className="text-[13px] text-red-600 dark:text-red-400">{error}</span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/quiz")}
            className="px-6 py-2.5 rounded-xl border border-[--border-subtle] text-[14px] text-[--text-primary] hover:bg-[--bg-card-hover] transition-colors"
          >
            返回测验列表
          </button>
        )}
      </div>
    </div>
  );
}
