"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

const AVAILABLE_MODELS = [
  { id: "qwen2.5:7b", name: "Qwen 2.5 7B（本地）", desc: "速度/效果平衡，推荐首选" },
  { id: "qwen2.5:3b", name: "Qwen 2.5 3B（本地）", desc: "更快更省显存，但效果略降" },
  { id: "llama3.1:8b", name: "Llama 3.1 8B（本地）", desc: "综合能力强，资源占用略高" },
];

type Tab = "connection" | "knowledge" | "other";

interface Config {
  base_url: string;
  model: string;
  teacher_name: string;
  teacher_contact: string;
  teacher_contact_type: string;
  similarity_threshold: number;
}

interface KnowledgeStats {
  count: number;
}

interface KnowledgePreviewItem {
  id: number;
  question: string;
  answer: string;
}

const TOKEN_KEY = "admin-token";
const LOCAL_BASE_URL_HINT = "http://127.0.0.1:11435/v1";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState({
    base_url: "",
    model: "",
    teacher_name: "",
    teacher_contact: "",
    teacher_contact_type: "",
    similarity_threshold: 0.15,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStats | null>(null);
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [knowledgeUploading, setKnowledgeUploading] = useState(false);
  const [knowledgeMessage, setKnowledgeMessage] = useState("");
  const [knowledgeError, setKnowledgeError] = useState("");
  const [knowledgeInputKey, setKnowledgeInputKey] = useState(0);
  const [knowledgePreview, setKnowledgePreview] = useState<KnowledgePreviewItem[]>([]);
  const [knowledgePreviewLoading, setKnowledgePreviewLoading] = useState(false);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("connection");

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const fetchKnowledgeStats = async (adminToken: string) => {
    try {
      const res = await fetch("/api/admin/knowledge/stats", {
        headers: { "X-Admin-Token": adminToken },
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (res.ok) {
        setKnowledgeStats({ count: data.count ?? 0 });
      }
    } catch {
      // 忽略统计加载失败，避免影响其他功能
    }
  };

  const fetchKnowledgePreview = async (adminToken: string) => {
    setKnowledgePreviewLoading(true);
    try {
      const res = await fetch("/api/admin/knowledge/preview?limit=120", {
        headers: { "X-Admin-Token": adminToken },
      });
      if (res.status === 401) return;
      const data = await res.json();
      if (res.ok) {
        setKnowledgePreview(Array.isArray(data.items) ? data.items : []);
      }
    } catch {
      // 忽略预览加载失败，避免影响上传功能
    } finally {
      setKnowledgePreviewLoading(false);
    }
  };

  const filteredPreview = useMemo(() => {
    const q = knowledgeQuery.trim().toLowerCase();
    if (!q) return knowledgePreview;
    return knowledgePreview.filter((item) => {
      const text = `${item.question} ${item.answer}`.toLowerCase();
      return text.includes(q);
    });
  }, [knowledgePreview, knowledgeQuery]);

  useEffect(() => {
    if (!token) return;
    fetchKnowledgeStats(token);
    fetchKnowledgePreview(token);
    fetch("/api/admin/config", {
      headers: { "X-Admin-Token": token },
    })
      .then((r) => {
        if (r.status === 401) {
          setToken("");
          localStorage.removeItem(TOKEN_KEY);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setConfig(data);
        setForm({
          base_url: data.base_url || LOCAL_BASE_URL_HINT,
          model: data.model || "qwen2.5:3b",
          teacher_name: data.teacher_name || "",
          teacher_contact: data.teacher_contact || "",
          teacher_contact_type: data.teacher_contact_type || "其他",
          similarity_threshold: data.similarity_threshold || 0.15,
        });
      })
      .catch(() => setError("无法连接后端服务"));
  }, [token]);

  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem(TOKEN_KEY, data.token);
      } else {
        setLoginError(data.detail || "密码错误");
      }
    } catch {
      setLoginError("无法连接后端服务");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem(TOKEN_KEY);
    setConfig(null);
    setKnowledgeStats(null);
    setKnowledgePreview([]);
    setKnowledgeFile(null);
    setKnowledgeMessage("");
    setKnowledgeError("");
    setKnowledgeQuery("");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    const updates: Record<string, string | number> = {};
    updates.base_url = form.base_url || LOCAL_BASE_URL_HINT;
    if (form.model) updates.model = form.model;
    if (form.teacher_name) updates.teacher_name = form.teacher_name;
    if (form.teacher_contact) updates.teacher_contact = form.teacher_contact;
    if (form.teacher_contact_type)
      updates.teacher_contact_type = form.teacher_contact_type;
    updates.similarity_threshold = form.similarity_threshold;

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setMessage("配置保存成功");
      } else {
        setError(data.detail || "保存失败");
      }
    } catch {
      setError("无法连接后端服务");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/test-connection", {
        method: "POST",
        headers: { "X-Admin-Token": token },
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "无法连接后端服务" });
    } finally {
      setTesting(false);
    }
  };

  const handleUploadKnowledge = async () => {
    if (!knowledgeFile) {
      setKnowledgeError("请先选择知识库文件");
      return;
    }
    setKnowledgeUploading(true);
    setKnowledgeMessage("");
    setKnowledgeError("");
    try {
      const formData = new FormData();
      formData.append("file", knowledgeFile);

      const res = await fetch("/api/admin/knowledge/upload", {
        method: "POST",
        headers: { "X-Admin-Token": token },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setKnowledgeMessage(data.message || "知识库上传成功");
        setKnowledgeStats({ count: data.count ?? 0 });
        setKnowledgeFile(null);
        setKnowledgeInputKey((k) => k + 1);
        fetchKnowledgePreview(token);
        fetchKnowledgeStats(token);
      } else {
        setKnowledgeError(data.detail || "知识库上传失败");
      }
    } catch {
      setKnowledgeError("无法连接后端服务");
    } finally {
      setKnowledgeUploading(false);
    }
  };

  const inputClass =
    "w-full sf-input px-4 py-2.5 text-sm border border-[color:var(--border-subtle)]";

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-sm sf-glass rounded-2xl p-8">
          <h1 className="text-xl font-bold text-[--text-primary] mb-1 text-center">
            系统管理
          </h1>
          <p className="text-sm text-[--text-muted] mb-6 text-center">
            请输入管理员密码
          </p>
          {loginError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {loginError}
            </div>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="输入管理员密码"
            className={`${inputClass} mb-4`}
            autoFocus
          />
          <button
            onClick={handleLogin}
            disabled={loggingIn || !password}
            className="w-full py-3 bg-[--accent] text-white font-semibold text-[15px] rounded-xl hover:opacity-85 disabled:opacity-40 transition-opacity shadow-sm"
            style={{ boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)" }}
          >
            {loggingIn ? "验证中..." : "登录"}
          </button>
          <Link
            href="/"
            className="block text-center text-sm text-[--text-muted] mt-4 hover:text-[--accent] transition-colors"
          >
            返回问答页面
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "connection", label: "连接配置" },
    { id: "knowledge", label: "知识库" },
    { id: "other", label: "其他配置" },
  ];

  return (
    <div className="min-h-dvh overflow-y-auto py-6 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[--accent] hover:opacity-70 transition-opacity"
          >
            &larr; 返回问答页面
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-[--text-muted] hover:text-red-400 transition-colors"
          >
            退出登录
          </button>
        </div>

        <div className="sf-glass rounded-2xl overflow-hidden">
          <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-[--text-primary] mb-1">
              系统管理
            </h1>
            <p className="text-sm text-[--text-muted]">
              本系统仅使用本地模型（不再使用远程 API Key）
            </p>
          </div>

          <div className="px-6 sm:px-8" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <nav className="flex gap-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMessage("");
                    setError("");
                    setKnowledgeMessage("");
                    setKnowledgeError("");
                  }}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-[--accent] text-[--accent]"
                      : "border-transparent text-[--text-muted] hover:text-[--text-secondary]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
                {message}
              </div>
            )}

            {activeTab === "connection" && (
              <div className="space-y-6">
                <div className="p-3 rounded-xl text-sm border border-[color:var(--border-subtle)] bg-[var(--bg-card)]">
                  <p className="text-[--text-primary] font-medium">
                    已锁定本地部署模式
                  </p>
                  <p className="text-[--text-muted] mt-1 text-xs">
                    为节省学校成本，系统已取消远程 API Key，仅使用本地 Ollama（或其他本地 OpenAI 兼容服务）。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
                    本地服务 Base URL
                  </label>
                  <input
                    type="text"
                    value={form.base_url}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, base_url: e.target.value }))
                    }
                    placeholder={LOCAL_BASE_URL_HINT}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-[--text-muted]">
                    推荐使用：`http://127.0.0.1:11435/v1`
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-2">
                    AI 模型
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_MODELS.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: form.model === m.id ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "var(--bg-card)",
                          border: form.model === m.id ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" : "1px solid var(--border-subtle)",
                        }}
                      >
                        <input
                          type="radio"
                          name="model"
                          value={m.id}
                          checked={form.model === m.id}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, model: e.target.value }))
                          }
                          className="accent-[--accent] flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[--text-primary] truncate">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-[--text-muted]">{m.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-[--text-muted] mb-1.5">
                      或手动输入本地模型 ID
                    </label>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, model: e.target.value }))
                      }
                      placeholder="例如：qwen2.5:7b"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="px-4 py-2.5 text-sm font-medium rounded-xl text-[--accent] disabled:opacity-40 transition-all"
                    style={{ border: "2px solid var(--accent)" }}
                  >
                    {testing ? "测试中..." : "测试本地模型连接"}
                  </button>
                  {testResult && (
                    <span
                      className={`text-sm ${
                        testResult.success ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {testResult.message}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeTab === "knowledge" && (
              <div className="space-y-5">
                {knowledgeError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {knowledgeError}
                  </div>
                )}
                {knowledgeMessage && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
                    {knowledgeMessage}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[color:var(--border-subtle)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[--text-muted]">知识库总条目</p>
                    <p className="text-2xl font-semibold text-[--text-primary] mt-1">
                      {knowledgeStats?.count ?? "-"}
                    </p>
                    <p className="text-[11px] text-[--text-muted] mt-2">
                      上传新文件后会自动重建索引，立即生效。
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--border-subtle)] bg-[var(--bg-card)] p-4">
                    <p className="text-xs text-[--text-muted]">当前上传文件</p>
                    <p className="text-sm text-[--text-primary] mt-1 break-all">
                      {knowledgeFile ? knowledgeFile.name : "未选择文件"}
                    </p>
                    <p className="text-[11px] text-[--text-muted] mt-2">
                      支持 `.xlsx`、`.json`、`.csv`
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[color:var(--border-subtle)] p-4">
                  <h2 className="text-base font-semibold text-[--text-primary] mb-2">
                    上传知识库文件
                  </h2>
                  <p className="text-xs text-[--text-muted] mb-3">
                    建议优先使用“问题/答案”列模板，上传后会覆盖旧知识库。
                  </p>
                  <input
                    key={knowledgeInputKey}
                    type="file"
                    accept=".xlsx,.json,.csv"
                    onChange={(e) => setKnowledgeFile(e.target.files?.[0] ?? null)}
                    className={inputClass}
                  />
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <button
                      onClick={handleUploadKnowledge}
                      disabled={knowledgeUploading || !knowledgeFile}
                      className="px-4 py-2.5 text-sm font-medium rounded-xl bg-[--accent] text-white disabled:opacity-40 transition-opacity"
                    >
                      {knowledgeUploading ? "上传并重建中..." : "上传并立即生效"}
                    </button>
                    <span className="text-[11px] text-[--text-muted]">
                      {knowledgeFile ? "已就绪，可上传" : "请选择文件"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[color:var(--border-subtle)] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-base font-semibold text-[--text-primary]">
                      知识内容预览
                    </h2>
                    <button
                      onClick={() => fetchKnowledgePreview(token)}
                      disabled={knowledgePreviewLoading}
                      className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--border-subtle)] text-[--text-secondary] hover:text-[--text-primary] transition-colors disabled:opacity-50"
                    >
                      {knowledgePreviewLoading ? "刷新中..." : "刷新列表"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={knowledgeQuery}
                    onChange={(e) => setKnowledgeQuery(e.target.value)}
                    placeholder="按问题或答案关键字筛选..."
                    className={inputClass}
                  />
                  <p className="text-[11px] text-[--text-muted] mt-2">
                    显示 {filteredPreview.length} 条（预览上限 120 条）
                  </p>

                  <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-[color:var(--border-subtle)]">
                    {filteredPreview.length === 0 ? (
                      <div className="px-4 py-8 text-sm text-center text-[--text-muted]">
                        暂无可展示的知识条目
                      </div>
                    ) : (
                      filteredPreview.map((item) => (
                        <div
                          key={`${item.id}-${item.question}`}
                          className="px-4 py-3 border-b border-[color:var(--border-subtle)] last:border-b-0"
                        >
                          <p className="text-sm font-medium text-[--text-primary]">
                            Q：{item.question}
                          </p>
                          <p className="text-xs text-[--text-secondary] mt-1">
                            A：{item.answer}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "other" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
                    检索相似度阈值：{form.similarity_threshold}
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={form.similarity_threshold}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        similarity_threshold: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-[--accent]"
                  />
                  <p className="mt-1 text-xs text-[--text-muted]">
                    越低越容易匹配到知识库内容，越高要求越严格
                  </p>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
                  <h2 className="text-base font-semibold text-[--text-primary] mb-4">
                    老师联系方式
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
                        老师姓名
                      </label>
                      <input
                        type="text"
                        value={form.teacher_name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, teacher_name: e.target.value }))
                        }
                        placeholder="例：吴迪老师"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
                        联系方式类型
                      </label>
                      <select
                        value={form.teacher_contact_type}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, teacher_contact_type: e.target.value }))
                        }
                        className={inputClass}
                      >
                        <option value="微信">微信</option>
                        <option value="QQ">QQ</option>
                        <option value="邮箱">邮箱</option>
                        <option value="电话">电话</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
                        联系方式
                      </label>
                      <input
                        type="text"
                        value={form.teacher_contact}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, teacher_contact: e.target.value }))
                        }
                        placeholder="输入联系方式"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "knowledge" && (
              <div className="mt-8">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`w-full py-3.5 font-semibold text-[15px] rounded-xl transition-all shadow-sm ${
                    saving
                      ? "bg-[var(--bg-card)] text-[--text-secondary] border border-[color:var(--border-subtle)] cursor-not-allowed"
                      : "bg-[--accent] text-white hover:opacity-90"
                  }`}
                  style={
                    saving
                      ? { boxShadow: "none" }
                      : { boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)" }
                  }
                >
                  {saving ? "保存中..." : "保存配置"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
