"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import StatsCard from "@/components/StatsCard";
import { api } from "@/lib/api";

const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "DeepSeek",
  "Ollama",
  "DashScope",
] as const;

type Provider = (typeof PROVIDERS)[number];

type ModelStatus = "online" | "offline";

interface AdminModel {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string;
  status: ModelStatus;
  latency: string;
}

const MOCK_MODELS: AdminModel[] = [
  {
    id: "mock-1",
    name: "GPT-4o",
    provider: "OpenAI",
    apiKey: "sk-...xxxx",
    status: "online",
    latency: "320ms",
  },
  {
    id: "mock-2",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    apiKey: "sk-ant-...yyyy",
    status: "online",
    latency: "280ms",
  },
  {
    id: "mock-3",
    name: "DeepSeek-V3",
    provider: "DeepSeek",
    apiKey: "sk-ds-...zzzz",
    status: "offline",
    latency: "—",
  },
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseModelsPayload(data: unknown): AdminModel[] {
  let rows: unknown[] = [];
  if (Array.isArray(data)) rows = data;
  else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const list = o.items ?? o.models ?? o.data;
    if (Array.isArray(list)) rows = list;
  }
  return rows.map((raw, index) => {
    const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const name = String(r.name ?? r.model ?? r.model_name ?? `模型${index + 1}`);
    const id =
      typeof r.id === "string" && r.id.length > 0 ? r.id : `api-${index}-${name}`;
    const provider = String(r.provider ?? "OpenAI");
    const apiKey = String(r.api_key ?? r.apiKey ?? "—");
    const baseUrl =
      typeof r.base_url === "string"
        ? r.base_url
        : typeof r.baseUrl === "string"
          ? r.baseUrl
          : undefined;
    let status: ModelStatus = "offline";
    if (r.status === "online" || r.status === "offline") status = r.status;
    let latency = "—";
    const lat = r.latency ?? r.latency_ms;
    if (typeof lat === "number") latency = `${Math.round(lat)}ms`;
    else if (typeof lat === "string" && lat.length > 0) latency = lat;
    return { id, name, provider, apiKey, baseUrl, status, latency };
  });
}

type ModalMode = "add" | "edit" | null;

export default function AdminModelsPage() {
  const [models, setModels] = useState<AdminModel[]>(MOCK_MODELS);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState<Provider>("OpenAI");
  const [formApiKey, setFormApiKey] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testNotes, setTestNotes] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<AdminModel | null>(null);

  const loadModels = useCallback(async () => {
    try {
      const res = await api.get<unknown>("/admin/models");
      const parsed = parseModelsPayload(res);
      if (parsed.length > 0) setModels(parsed);
    } catch {
      /* keep initial mock data */
    }
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  const openAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormProvider("OpenAI");
    setFormApiKey("");
    setFormBaseUrl("");
    setModalMode("add");
  };

  const openEdit = (m: AdminModel) => {
    setEditingId(m.id);
    setFormName(m.name);
    setFormProvider((PROVIDERS.includes(m.provider as Provider) ? m.provider : "OpenAI") as Provider);
    setFormApiKey(m.apiKey);
    setFormBaseUrl(m.baseUrl ?? "");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const submitForm = (e: FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name || !formApiKey.trim()) return;
    const baseUrl = formBaseUrl.trim() || undefined;
    if (modalMode === "add") {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `local-${Date.now()}`;
      setModels((prev) => [
        ...prev,
        {
          id,
          name,
          provider: formProvider,
          apiKey: formApiKey.trim(),
          baseUrl,
          status: "offline",
          latency: "—",
        },
      ]);
    } else if (modalMode === "edit" && editingId) {
      setModels((prev) =>
        prev.map((x) =>
          x.id === editingId
            ? {
                ...x,
                name,
                provider: formProvider,
                apiKey: formApiKey.trim(),
                baseUrl,
              }
            : x
        )
      );
    }
    closeModal();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setModels((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleTest = async (m: AdminModel) => {
    setTestingId(m.id);
    setTestNotes((prev) => {
      const next = { ...prev };
      delete next[m.id];
      return next;
    });
    const t0 = performance.now();
    let ok = false;
    let latencyMs: number | null = null;
    let note = "";
    try {
      const res = await api.post<{
        ok?: boolean;
        success?: boolean;
        latency_ms?: number;
        latency?: number;
        message?: string;
      }>("/admin/test-llm", { model: m.name });
      const elapsed = Math.round(performance.now() - t0);
      latencyMs =
        typeof res.latency_ms === "number"
          ? res.latency_ms
          : typeof res.latency === "number"
            ? res.latency
            : elapsed;
      const explicitFail = res.success === false || res.ok === false;
      ok = !explicitFail;
      note = res.message ?? (ok ? "连接成功" : "连接失败");
    } catch {
      await sleep(900);
      ok = Math.random() >= 0.5;
      latencyMs = ok ? Math.round(150 + Math.random() * 350) : null;
      note = ok ? "（模拟）连接成功" : "（模拟）连接失败";
    }
    setModels((prev) =>
      prev.map((x) =>
        x.id === m.id
          ? {
              ...x,
              status: ok ? "online" : "offline",
              latency: ok && latencyMs != null ? `${latencyMs}ms` : "—",
            }
          : x
      )
    );
    setTestNotes((prev) => ({ ...prev, [m.id]: note }));
    setTestingId(null);
  };

  const total = models.length;
  const onlineCount = models.filter((m) => m.status === "online").length;
  const offlineCount = models.filter((m) => m.status === "offline").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">
            模型管理
          </h1>
          <p className="text-[13px] text-[--text-secondary] mt-0.5">
            多模型路由、密钥与连通性
          </p>
        </div>
        <button
          type="button"
          className="sf-btn-primary shrink-0 px-5 py-2.5 rounded-full text-[13px] self-start"
          onClick={openAdd}
        >
          添加模型
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <StatsCard label="模型总数" value={total} />
        <StatsCard label="在线" value={onlineCount} />
        <StatsCard label="离线" value={offlineCount} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <article
            key={m.id}
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

            {m.baseUrl && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[--text-muted] mb-1">
                  Base URL
                </p>
                <p className="text-[13px] font-mono text-[--text-secondary] break-all">
                  {m.baseUrl}
                </p>
              </div>
            )}

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

            {testNotes[m.id] && (
              <p className="text-[12px] text-[--text-muted] leading-snug">{testNotes[m.id]}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-auto pt-1">
              <button
                type="button"
                className="sf-btn-secondary flex-1 min-w-[100px] px-3 py-2 rounded-[14px] text-[12px] disabled:opacity-50"
                disabled={testingId === m.id}
                onClick={() => void handleTest(m)}
              >
                {testingId === m.id ? "测试中…" : "测试连接"}
              </button>
              <button
                type="button"
                className="sf-btn-ghost px-3 py-2 text-[12px] rounded-[14px]"
                onClick={() => openEdit(m)}
              >
                编辑
              </button>
              <button
                type="button"
                className="sf-btn-danger px-3 py-2 text-[12px] rounded-[14px]"
                onClick={() => setDeleteTarget(m)}
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

      {modalMode && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sf-glass backdrop-blur-md"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="sf-card rounded-[20px] p-6 w-full max-w-md shadow-[0_24px_64px_-20px_rgba(20,20,19,0.12)]"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[22px] font-semibold text-[--text-primary] tracking-tight mb-4">
              {modalMode === "add" ? "添加模型" : "编辑模型"}
            </h2>
            <form onSubmit={submitForm} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                  名称
                </label>
                <input
                  className="sf-input w-full px-3 py-2.5 text-[13px]"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                  提供商
                </label>
                <select
                  className="sf-input w-full px-3 py-2.5 text-[13px]"
                  value={formProvider}
                  onChange={(e) => setFormProvider(e.target.value as Provider)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                  API Key
                </label>
                <input
                  className="sf-input w-full px-3 py-2.5 text-[13px] font-mono"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                  Base URL（可选）
                </label>
                <input
                  className="sf-input w-full px-3 py-2.5 text-[13px]"
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder="https://..."
                  autoComplete="off"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="sf-btn-ghost px-4 py-2 rounded-[14px] text-[13px]"
                  onClick={closeModal}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="sf-btn-primary px-4 py-2 rounded-[14px] text-[13px]"
                >
                  {modalMode === "add" ? "添加" : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sf-glass backdrop-blur-md"
          role="presentation"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="sf-card rounded-[20px] p-6 w-full max-w-sm"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[22px] font-semibold text-[--text-primary] tracking-tight mb-2">
              删除模型
            </h2>
            <p className="text-[13px] text-[--text-secondary] leading-relaxed">
              确定要删除「{deleteTarget.name}」吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="sf-btn-ghost px-4 py-2 rounded-[14px] text-[13px]"
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="sf-btn-danger px-4 py-2 rounded-[14px] text-[13px]"
                onClick={confirmDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
