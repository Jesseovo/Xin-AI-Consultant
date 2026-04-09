"use client";

import { useState } from "react";
import { api } from "@/lib/api";

type TabId = "rewrite" | "expand" | "summarize" | "translate";

interface TabDef {
  id: TabId;
  label: string;
  placeholder: string;
  endpoint: string;
}

const TABS: TabDef[] = [
  { id: "rewrite", label: "改写", placeholder: "粘贴需要改写的文本…", endpoint: "/cowriter/rewrite" },
  { id: "expand", label: "扩写", placeholder: "粘贴需要扩写的文本…", endpoint: "/cowriter/expand" },
  { id: "summarize", label: "摘要", placeholder: "粘贴需要摘要的长文本…", endpoint: "/cowriter/summarize" },
  { id: "translate", label: "翻译", placeholder: "粘贴需要翻译的文本…", endpoint: "/cowriter/translate" },
];

const LANGUAGES = [
  { value: "英语", label: "英语" },
  { value: "日语", label: "日语" },
  { value: "韩语", label: "韩语" },
  { value: "法语", label: "法语" },
  { value: "中文", label: "中文" },
];

export default function WriterPage() {
  const [activeTab, setActiveTab] = useState<TabId>("rewrite");
  const [inputText, setInputText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [targetLang, setTargetLang] = useState("英语");
  const [outputText, setOutputText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setOutputText("");
    setError(null);
  };

  const handleSubmit = async () => {
    const text = inputText.trim();
    if (!text) return;
    setProcessing(true);
    setError(null);
    setOutputText("");

    try {
      let body: Record<string, unknown>;
      if (activeTab === "rewrite") {
        body = { text, instruction: instruction.trim() || "使语言更加流畅自然" };
      } else if (activeTab === "expand") {
        body = { text };
      } else if (activeTab === "summarize") {
        body = { text };
      } else {
        body = { text, target_language: targetLang };
      }

      const res = await api.post<{ text: string }>(currentTab.endpoint, body);
      setOutputText(res.text || "（无输出）");
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败，请稍后重试");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (outputText) {
      try { await navigator.clipboard.writeText(outputText); } catch { /* ignore */ }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">写作助手</h1>
        <p className="text-[13px] text-[--text-secondary] mt-0.5">AI 驱动的改写、扩写、摘要和翻译工具</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[--bg-card] border border-[--border-subtle] mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-[14px] font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[--accent] text-white shadow-sm"
                : "text-[--text-secondary] hover:text-[--text-primary]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main area */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-[--text-secondary]">输入文本</label>
            <span className="text-[11px] text-[--text-muted]">{inputText.length} 字</span>
          </div>
          <textarea
            className="sf-input flex-1 w-full px-4 py-3 text-[14px] border border-[--border-subtle] min-h-[240px] resize-y"
            placeholder={currentTab.placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {/* Extra controls */}
          {activeTab === "rewrite" && (
            <div className="mt-3">
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">改写指令（可选）</label>
              <input
                className="sf-input w-full px-3 py-2.5 text-[13px] border border-[--border-subtle]"
                placeholder="例：使语气更正式 / 简化表达 / 增加学术性"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
              />
            </div>
          )}

          {activeTab === "translate" && (
            <div className="mt-3">
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">目标语言</label>
              <select
                className="sf-input px-3 py-2.5 text-[13px] border border-[--border-subtle]"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="mt-3 text-[13px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={processing || !inputText.trim()}
            className="mt-4 px-6 py-2.5 rounded-xl bg-[--accent] text-white text-[14px] font-medium disabled:opacity-40 transition-opacity self-start"
          >
            {processing ? "处理中…" : `开始${currentTab.label}`}
          </button>
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[13px] font-medium text-[--text-secondary]">输出结果</label>
            {outputText && (
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="text-[12px] text-[--accent] hover:underline"
              >
                复制
              </button>
            )}
          </div>
          <div className="sf-card flex-1 w-full px-4 py-3 text-[14px] border border-[--border-subtle] min-h-[240px] rounded-xl overflow-auto whitespace-pre-wrap">
            {processing ? (
              <div className="flex items-center gap-2 text-[--text-muted]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[--accent] animate-pulse" />
                处理中，请稍候…
              </div>
            ) : outputText ? (
              <p className="text-[--text-primary] leading-relaxed">{outputText}</p>
            ) : (
              <p className="text-[--text-muted]">结果将显示在这里</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
