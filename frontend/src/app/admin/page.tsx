"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const AVAILABLE_MODELS = [
  // 云端模型
  { id: "qwen3.5-plus", name: "Qwen 3.5 Plus", desc: "文本生成、深度思考、视觉理解" },
  { id: "qwen3-max-2026-01-23", name: "Qwen 3 Max", desc: "文本生成、深度思考" },
  { id: "qwen3-coder-next", name: "Qwen 3 Coder Next", desc: "文本生成" },
  { id: "qwen3-coder-plus", name: "Qwen 3 Coder Plus", desc: "文本生成" },
  { id: "glm-5", name: "GLM-5 (智谱)", desc: "文本生成、深度思考" },
  { id: "glm-4.7", name: "GLM-4.7 (智谱)", desc: "文本生成、深度思考" },
  { id: "kimi-k2.5", name: "Kimi K2.5", desc: "文本生成、深度思考、视觉理解" },
  { id: "MiniMax-M2.5", name: "MiniMax M2.5", desc: "文本生成、深度思考" },
  // 本地轻量模型（OpenAI 兼容服务，如 Ollama）
  { id: "qwen2.5:7b", name: "Qwen 2.5 7B（本地）", desc: "速度/效果平衡，推荐首选" },
  { id: "qwen2.5:3b", name: "Qwen 2.5 3B（本地）", desc: "更快更省显存，但效果略降" },
  { id: "llama3.1:8b", name: "Llama 3.1 8B（本地）", desc: "综合能力强，资源占用略高" },
];

type Tab = "connection" | "knowledge" | "other";

interface Config {
  api_key: string;
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

const TOKEN_KEY = "admin-token";

export default function AdminPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState({
    api_key: "",
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

  useEffect(() => {
    if (!token) return;
    fetchKnowledgeStats(token);
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
          api_key: "",
          base_url: data.base_url || "",
          model: data.model || "qwen3.5-plus",
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
    setKnowledgeFile(null);
    setKnowledgeMessage("");
    setKnowledgeError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    const updates: Record<string, string | number> = {};
    if (form.api_key) updates.api_key = form.api_key;
    if (form.base_url) updates.base_url = form.base_url;
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
        setForm((prev) => ({ ...prev, api_key: "" }));
        setMessage("配置保存成功，正在跳转...");
        setTimeout(() => router.push("/"), 1200);
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
      } else {
        setKnowledgeError(data.detail || "知识库上传失败");
      }
    } catch {
      setKnowledgeError("无法连接后端服务");
    } finally {
      setKnowledgeUploading(false);
    }
  };

  const inputClass = "w-full sf-input px-4 py-2.5 text-sm";

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
              配置 AI 模型、API 密钥和老师联系方式
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
                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={form.api_key}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, api_key: e.target.value }))
                    }
                    placeholder={
                      config?.api_key ? "已设置（留空保持不变）" : "输入 API Key"
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-[--text-muted]">
                    远程模型必填；本地 OpenAI 兼容服务（localhost/127.0.0.1）可留空。
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[--text-secondary] mb-1.5">
                    API Base URL
                  </label>
                  <input
                    type="text"
                    value={form.base_url}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, base_url: e.target.value }))
                    }
                    placeholder="例如：https://coding.dashscope.aliyuncs.com/v1 或 http://127.0.0.1:11435/v1"
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-[--text-muted]">
                    本地模型推荐：`http://127.0.0.1:11435/v1`
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
                      或手动输入模型 ID（推荐）
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
                    {testing ? "测试中..." : "测试 API 连接"}
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
              <div className="space-y-6">
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

                <div>
                  <h2 className="text-base font-semibold text-[--text-primary] mb-2">
                    知识库文件上传
                  </h2>
                  <p className="text-sm text-[--text-muted] mb-4">
                    支持上传 `.xlsx`、`.json`、`.csv`。上传成功后会立即重建检索索引并生效。
                  </p>
                  <div className="text-sm text-[--text-secondary] mb-3">
                    当前知识库条目：
                    <span className="text-[--text-primary] font-semibold ml-1">
                      {knowledgeStats?.count ?? "-"}
                    </span>
                  </div>
                  <input
                    key={knowledgeInputKey}
                    type="file"
                    accept=".xlsx,.json,.csv"
                    onChange={(e) => setKnowledgeFile(e.target.files?.[0] ?? null)}
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-[--text-muted]">
                    建议优先使用带“问题/答案”列的文件模板。
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleUploadKnowledge}
                    disabled={knowledgeUploading || !knowledgeFile}
                    className="px-4 py-2.5 text-sm font-medium rounded-xl bg-[--accent] text-white disabled:opacity-40 transition-opacity"
                  >
                    {knowledgeUploading ? "上传并重建中..." : "上传并立即生效"}
                  </button>
                  <span className="text-xs text-[--text-muted]">
                    {knowledgeFile ? `已选择：${knowledgeFile.name}` : "未选择文件"}
                  </span>
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
                  className="w-full py-3.5 bg-[--accent] text-white font-semibold text-[15px] rounded-xl hover:opacity-85 disabled:opacity-40 transition-opacity shadow-sm"
                  style={{ boxShadow: "0 2px 8px rgba(0, 122, 255, 0.25)" }}
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
