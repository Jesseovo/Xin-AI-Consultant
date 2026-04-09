"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface PlanStep {
  title: string;
  summary: string;
  [key: string]: unknown;
}

interface StepContent {
  content: string;
}

const MOCK_STEPS: PlanStep[] = [
  { title: "理解递归的基本概念", summary: "学习递归函数的定义、基线条件和递归条件。" },
  { title: "分析经典递归问题", summary: "通过阶乘、斐波那契和汉诺塔理解递归思维。" },
  { title: "递归与迭代的对比", summary: "比较递归和循环的优劣，理解尾递归优化。" },
  { title: "分治法与递归", summary: "学习归并排序、快速排序中的递归应用。" },
];

export default function LearningPage() {
  const [topic, setTopic] = useState("");
  const [numSteps, setNumSteps] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const [planTitle, setPlanTitle] = useState("");
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [expanded, setExpanded] = useState<Record<number, string>>({});
  const [loadingStep, setLoadingStep] = useState<number | null>(null);

  const handleGenerate = async () => {
    const t = topic.trim();
    if (!t) return;
    setGenerating(true);
    setError(null);
    setSteps([]);
    setExpanded({});

    try {
      const res = await api.post<{ title?: string; steps: PlanStep[] }>("/guided/plan", {
        topic: t,
        num_steps: numSteps,
      });
      setPlanTitle(res.title || t);
      setSteps(res.steps || []);
      setIsDemo(false);
    } catch {
      setPlanTitle(`${t}（演示）`);
      setSteps(MOCK_STEPS.slice(0, numSteps));
      setIsDemo(true);
    } finally {
      setGenerating(false);
    }
  };

  const toggleStep = async (idx: number) => {
    if (expanded[idx] !== undefined) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
      return;
    }

    const step = steps[idx];
    if (!step) return;

    if (isDemo) {
      setExpanded((prev) => ({
        ...prev,
        [idx]: `## ${step.title}\n\n${step.summary}\n\n这是演示模式下的占位内容。连接后端后将显示 AI 生成的详细学习材料。`,
      }));
      return;
    }

    setLoadingStep(idx);
    try {
      const res = await api.post<StepContent>("/guided/step-content", {
        step,
        topic_hint: planTitle,
      });
      setExpanded((prev) => ({
        ...prev,
        [idx]: res.content || "（暂无内容）",
      }));
    } catch {
      setExpanded((prev) => ({
        ...prev,
        [idx]: "加载失败，请重试。",
      }));
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">学习中心</h1>
        <p className="text-[13px] text-[--text-secondary] mt-0.5">输入主题，AI 生成分步学习计划并展开详解</p>
      </div>

      {/* Generate form */}
      <div className="sf-card rounded-2xl p-6 mb-8 border border-[--border-subtle]">
        <h2 className="text-[16px] font-semibold text-[--text-primary] mb-4">生成学习计划</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">学习主题</label>
            <input
              className="sf-input w-full px-4 py-3 text-[15px]"
              placeholder="例：递归与分治算法"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleGenerate(); }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">步骤数</label>
            <select
              className="sf-input px-3 py-2.5 text-[14px]"
              value={numSteps}
              onChange={(e) => setNumSteps(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>{n} 步</option>
              ))}
            </select>
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
            {generating ? "生成中…" : "生成计划"}
          </button>
        </div>
      </div>

      {isDemo && steps.length > 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
          无法连接后端，当前为演示模式
        </div>
      )}

      {/* Plan */}
      {steps.length > 0 && (
        <div>
          <h2 className="text-[18px] font-semibold text-[--text-primary] mb-5">{planTitle}</h2>
          <div className="space-y-3">
            {steps.map((step, i) => {
              const isExpanded = expanded[i] !== undefined;
              const isLoading = loadingStep === i;
              return (
                <div key={i} className="sf-card rounded-xl border border-[--border-subtle] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => void toggleStep(i)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[--bg-card-hover] transition-colors"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[--accent]/10 text-[--accent] text-[13px] font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-medium text-[--text-primary]">{step.title}</h3>
                      <p className="text-[13px] text-[--text-secondary] mt-0.5">{step.summary}</p>
                    </div>
                    <span className="text-[--text-muted] text-[13px] shrink-0 mt-1 transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                      ▼
                    </span>
                  </button>

                  {(isExpanded || isLoading) && (
                    <div className="px-5 pb-5 pl-14 border-t border-[--border-subtle]">
                      {isLoading ? (
                        <div className="py-4 flex items-center gap-2 text-[--text-muted] text-[14px]">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[--accent] animate-pulse" />
                          加载中…
                        </div>
                      ) : (
                        <div className="py-4 prose-sm max-w-none">
                          {expanded[i]?.split("\n").map((line, li) => {
                            if (line.startsWith("## ")) {
                              return <h3 key={li} className="text-[15px] font-semibold text-[--text-primary] mt-3 mb-2">{line.slice(3)}</h3>;
                            }
                            if (line.startsWith("### ")) {
                              return <h4 key={li} className="text-[14px] font-semibold text-[--text-primary] mt-2 mb-1">{line.slice(4)}</h4>;
                            }
                            if (line.startsWith("- ")) {
                              return <li key={li} className="text-[14px] text-[--text-secondary] leading-relaxed ml-4">{line.slice(2)}</li>;
                            }
                            if (line.trim() === "") {
                              return <div key={li} className="h-2" />;
                            }
                            return <p key={li} className="text-[14px] text-[--text-secondary] leading-relaxed">{line}</p>;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {Object.keys(expanded).length === steps.length && steps.length > 0 && (
            <div className="mt-6 rounded-2xl p-6 text-center border border-[--border-subtle]">
              <img src="/images/student/learning-complete.png" alt="" className="w-20 h-20 mx-auto mb-3 object-contain" />
              <p className="text-[14px] font-medium text-[--accent]">所有步骤已展开，学习完成！</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!generating && steps.length === 0 && (
        <div className="sf-card rounded-2xl p-8 text-center border border-[--border-subtle]">
          <img src="/images/modes/guided.png" alt="" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <p className="text-[14px] text-[--text-secondary]">输入一个学习主题，AI 将为你生成分步计划</p>
        </div>
      )}
    </div>
  );
}
