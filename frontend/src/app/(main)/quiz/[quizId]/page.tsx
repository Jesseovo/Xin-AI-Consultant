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
        <button type="button" onClick={() => router.push("/quiz")} className="sf-btn-ghost mt-4 text-[14px] text-[--accent]">
          返回列表
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length;
  const totalQ = quiz.questions.length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button type="button" onClick={() => router.push("/quiz")} className="sf-btn-ghost text-[13px] text-[--accent] mb-3 -ml-1 px-2 py-1 rounded-full">
          ← 返回测验列表
        </button>
        <h1 className="text-[20px] font-semibold text-[--text-primary] tracking-tight">{quiz.title}</h1>
        <p className="text-[13px] text-[--text-secondary] mt-1">
          共 {totalQ} 题
          {quiz.created_at && ` · ${new Date(quiz.created_at).toLocaleDateString("zh-CN")}`}
        </p>
      </div>

      {isDemo && (
        <div
          className="mb-6 rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 px-4 py-2.5 text-sm text-[#6b5a3a] dark:text-amber-100/90 shadow-[0_0_0_1px_rgba(217,180,100,0.35)]"
          role="status"
        >
          演示模式 — 后端不可用，使用本地示例题目
        </div>
      )}

      {/* Score banner */}
      {submitted && score !== null && total !== null && (
        <div
          className="sf-card rounded-2xl p-8 mb-8 text-center overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(201, 100, 66, 0.12) 0%, var(--bg-card) 45%, rgba(107, 168, 154, 0.08) 100%)",
          }}
        >
          <img src="/images/student/quiz-complete.png" alt="" className="w-20 h-20 mx-auto mb-3 object-contain" />
          <p className="text-[13px] uppercase tracking-[0.2em] text-[--text-muted] mb-1">得分</p>
          <p className="text-[36px] font-bold tracking-tight">
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(120deg, var(--accent) 0%, #d97757 45%, var(--accent-secondary) 100%)" }}
            >
              {score}
            </span>
            <span className="text-[18px] text-[--text-muted] font-normal text-[--text-primary]"> / {total}</span>
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
              className={`sf-card rounded-2xl p-5 ${
                submitted
                  ? isCorrect
                    ? "shadow-[0_0_0_1px_rgba(107,168,154,0.45),0_4px_24px_rgba(107,168,154,0.08)]"
                    : "shadow-[0_0_0_1px_rgba(196,92,92,0.35),0_4px_24px_rgba(196,92,92,0.06)]"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--accent]/10 text-[--accent] text-[13px] font-semibold flex items-center justify-center shadow-[0_0_0_1px_rgba(201,100,66,0.2)]">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="sf-badge text-[11px] py-0.5 px-2.5 mb-2">
                    {q.type === "choice" ? "选择" : q.type === "true_false" ? "判断" : "填空"}
                  </span>
                  <p className="text-[15px] text-[--text-primary] leading-relaxed mt-1.5">{q.question}</p>
                </div>
              </div>

              {/* Answer area */}
              <div className="pl-11">
                {q.type === "choice" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const selected = answers[i] === opt;
                      return (
                        <label
                          key={oi}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-full cursor-pointer transition-all shadow-[0_0_0_1px_var(--border-subtle)] ${
                            selected
                              ? "bg-[--accent]/8 shadow-[0_0_0_1px_rgba(201,100,66,0.4)]"
                              : "hover:shadow-[0_0_0_1px_rgba(201,100,66,0.22)]"
                          } ${submitted ? "pointer-events-none opacity-85" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`q-${i}`}
                            value={opt}
                            checked={selected}
                            onChange={() => setAnswer(i, opt)}
                            disabled={submitted}
                            className="accent-[--accent] rounded-md shrink-0"
                          />
                          <span className="text-[14px] text-[--text-primary]">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : q.type === "true_false" ? (
                  <div className="flex flex-wrap gap-2">
                    {["正确", "错误"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAnswer(i, v)}
                        disabled={submitted}
                        className={`rounded-full px-5 py-2 text-[14px] font-medium transition-all ${
                          answers[i] === v
                            ? "bg-[--accent]/12 text-[--accent] shadow-[0_0_0_1px_rgba(201,100,66,0.4)]"
                            : "bg-[--chip-bg] text-[--text-secondary] shadow-[0_0_0_1px_var(--chip-border)] hover:bg-[--chip-hover-bg]"
                        } ${submitted ? "opacity-85" : ""}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    className="sf-input w-full px-3 py-2.5 text-[14px]"
                    placeholder="输入答案…"
                    value={answers[i] || ""}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    disabled={submitted}
                  />
                )}

                {/* Feedback */}
                {resultItem && (
                  <div
                    className={`mt-4 rounded-2xl px-3 py-2.5 text-[13px] shadow-[0_0_0_1px_var(--border-subtle)] ${
                      isCorrect
                        ? "bg-[color-mix(in_srgb,var(--accent-secondary)_14%,transparent)] text-[#3d6b60] dark:text-[#a8d4c8]"
                        : "bg-[#c45c5c]/10 text-[#8b4a4a] dark:text-[#e8b0b0]"
                    }`}
                  >
                    <p className="font-medium">{isCorrect ? "✓ 正确" : "✗ 错误"}</p>
                    {!isCorrect && (
                      <p className="mt-0.5">正确答案：{resultItem.correct_answer}</p>
                    )}
                    {resultItem.explanation && (
                      <p className="mt-1 text-[12px] opacity-85">{resultItem.explanation}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit / Back */}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {!submitted ? (
          <>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || answeredCount === 0}
              className="sf-btn-primary rounded-full px-6 py-2.5 text-[14px] disabled:opacity-40 disabled:pointer-events-none"
            >
              {submitting ? "提交中…" : `提交答案 (${answeredCount}/${totalQ})`}
            </button>
            {error && (
              <span className="text-[13px] text-[#a85c5c] dark:text-[#e8a8a8]">{error}</span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/quiz")}
            className="sf-btn-secondary rounded-full px-6 py-2.5 text-[14px]"
          >
            返回测验列表
          </button>
        )}
      </div>
    </div>
  );
}
