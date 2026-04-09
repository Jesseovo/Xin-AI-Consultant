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
      <div className="mb-10">
        <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">学习中心</h1>
        <p className="text-[13px] text-[--text-secondary] mt-1">输入主题，AI 生成分步学习计划并展开详解</p>
      </div>

      {/* Generate form */}
      <div className="sf-card rounded-2xl p-6 mb-8">
        <p className="text-[13px] uppercase tracking-[0.2em] text-[--text-muted] mb-2">计划</p>
        <h2 className="text-[16px] font-semibold text-[--text-primary] tracking-tight mb-5">生成学习路径</h2>
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
            <div className="rounded-2xl px-3 py-2.5 text-[13px] bg-[#c45c5c]/10 text-[#8b4a4a] dark:text-[#e8a8a8] shadow-[0_0_0_1px_rgba(196,92,92,0.2)]">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generating || !topic.trim()}
            className="sf-btn-primary rounded-full px-6 py-2.5 text-[14px] disabled:opacity-40 disabled:pointer-events-none"
          >
            {generating ? "生成中…" : "生成计划"}
          </button>
        </div>
      </div>

      {isDemo && steps.length > 0 && (
        <div
          className="mb-6 rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 px-4 py-2.5 text-sm text-[#6b5a3a] dark:text-amber-100/90 shadow-[0_0_0_1px_rgba(217,180,100,0.35)]"
          role="status"
        >
          无法连接后端，当前为演示模式
        </div>
      )}

      {/* Plan */}
      {steps.length > 0 && (
        <div>
          <p className="text-[13px] uppercase tracking-[0.2em] text-[--text-muted] mb-2">路线</p>
          <h2 className="text-[18px] font-semibold text-[--text-primary] tracking-tight mb-5">{planTitle}</h2>
          <div className="space-y-3">
            {steps.map((step, i) => {
              const isExpanded = expanded[i] !== undefined;
              const isLoading = loadingStep === i;
              return (
                <div key={i} className="sf-card rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => void toggleStep(i)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[--bg-card-hover]/80 transition-colors rounded-2xl"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--accent]/10 text-[--accent] text-[13px] font-semibold flex items-center justify-center mt-0.5 shadow-[0_0_0_1px_rgba(201,100,66,0.2)]">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-[--text-primary]">{step.title}</h3>
                      <p className="text-[13px] text-[--text-secondary] mt-0.5">{step.summary}</p>
                    </div>
                    <span className="text-[--text-muted] text-[13px] shrink-0 mt-1 transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                      ▼
                    </span>
                  </button>

                  {(isExpanded || isLoading) && (
                    <div className="px-5 pb-5 pl-14 mx-2 mb-2 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] dark:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]">
                      {isLoading ? (
                        <div className="py-4 space-y-3 animate-pulse" aria-busy="true">
                          <div className="sf-skeleton h-4 w-3/4" />
                          <div className="sf-skeleton h-3 w-full" />
                          <div className="sf-skeleton h-3 w-full" />
                          <div className="sf-skeleton h-3 w-5/6" />
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
            <div className="sf-card rounded-2xl p-8 mt-6 text-center">
              <img src="/images/student/learning-complete.png" alt="" className="w-20 h-20 mx-auto mb-3 object-contain" />
              <p className="text-[14px] font-medium text-[--accent-secondary]">所有步骤已展开，学习完成！</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!generating && steps.length === 0 && (
        <div className="sf-card rounded-2xl p-10 text-center">
          <img src="/images/modes/guided.png" alt="" className="w-28 h-28 mx-auto mb-5 object-contain opacity-95" />
          <p className="text-[15px] text-[--text-secondary] leading-relaxed max-w-sm mx-auto">
            输入一个学习主题，AI 将为你生成分步计划
          </p>
        </div>
      )}
    </div>
  );
}
