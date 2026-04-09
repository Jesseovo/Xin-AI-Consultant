"use client";

import { useState } from "react";

type ModelStatus = "online" | "offline";

interface MockModel {
  name: string;
  provider: string;
  apiKey: string;
  status: ModelStatus;
  latency: string;
}

const INITIAL_MODELS: MockModel[] = [
  {
    name: "GPT-4o",
    provider: "OpenAI",
    apiKey: "sk-...xxxx",
    status: "online",
    latency: "320ms",
  },
  {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    apiKey: "sk-ant-...yyyy",
    status: "online",
    latency: "280ms",
  },
  {
    name: "DeepSeek-V3",
    provider: "DeepSeek",
    apiKey: "sk-ds-...zzzz",
    status: "offline",
    latency: "—",
  },
];

export default function AdminModelsPage() {
  const [models, setModels] = useState<MockModel[]>(INITIAL_MODELS);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = (name: string) => {
    setTestingId(name);
    window.setTimeout(() => setTestingId(null), 900);
  };

  const handleDelete = (name: string) => {
    setModels((prev) => prev.filter((m) => m.name !== name));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">
            模型管理
          </h1>
          <p className="text-[13px] text-[--text-secondary] mt-0.5">
            多模型路由、密钥与连通性（演示数据）
          </p>
        </div>
        <button
          type="button"
          className="sf-btn-primary shrink-0 px-5 py-2.5 rounded-full text-[13px] self-start"
          onClick={() => {}}
        >
          添加模型
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <article
            key={m.name}
            className="sf-card rounded-[20px] p-5 flex flex-col gap-4"
          >
            <div>
              <h2 className="font-semibold text-[15px] text-[--text-primary] tracking-tight">
                {m.name}
              </h2>
              <span className="sf-badge mt-2">{m.provider}</span>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-[--text-muted] mb-1">
                API Key
              </p>
              <p className="text-[13px] font-mono text-[--text-secondary] tabular-nums break-all">
                {m.apiKey}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="inline-flex items-center gap-2 text-[--text-secondary]">
                <span
                  className={
                    m.status === "online" ? "sf-dot sf-dot-success" : "sf-dot sf-dot-error"
                  }
                  title={m.status === "online" ? "在线" : "离线"}
                />
                {m.status === "online" ? "在线" : "离线"}
              </span>
              <span className="text-[--text-muted] tabular-nums">{m.latency}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-auto pt-1">
              <button
                type="button"
                className="sf-btn-secondary flex-1 min-w-[100px] px-3 py-2 rounded-[14px] text-[12px] disabled:opacity-50"
                disabled={testingId === m.name}
                onClick={() => handleTest(m.name)}
              >
                {testingId === m.name ? "测试中…" : "测试连接"}
              </button>
              <button
                type="button"
                className="sf-btn-danger px-3 py-2 text-[12px] rounded-[14px]"
                onClick={() => handleDelete(m.name)}
              >
                删除
              </button>
            </div>
          </article>
        ))}
      </div>

      {models.length === 0 && (
        <div className="sf-card rounded-[20px] p-10 text-center text-[13px] text-[--text-muted]">
          暂无模型配置，点击「添加模型」开始
        </div>
      )}
    </div>
  );
}
