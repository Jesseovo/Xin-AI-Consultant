"use client";

import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";

interface SiteSettings {
  platformName: string;
  description: string;
}

interface RateLimitSettings {
  requestsPerMinute: number;
  maxTokensPerRequest: number;
}

interface SecuritySettings {
  registrationOpen: boolean;
  emailVerification: boolean;
}

interface SessionSettings {
  sessionTimeoutMinutes: number;
  maxConcurrentSessionsPerUser: number;
  maxMessageLength: number;
}

type VectorDbType = "chromadb" | "milvus" | "faiss";

interface AllowedFileTypes {
  pdf: boolean;
  docx: boolean;
  txt: boolean;
  md: boolean;
  xlsx: boolean;
}

interface StorageSettings {
  maxUploadMb: number;
  allowedFileTypes: AllowedFileTypes;
  vectorDbType: VectorDbType;
}

interface AdminUiConfig {
  site: SiteSettings;
  rateLimit: RateLimitSettings;
  security: SecuritySettings;
  session: SessionSettings;
  storage: StorageSettings;
}

const DEFAULT_CONFIG: AdminUiConfig = {
  site: {
    platformName: "智学助手",
    description: "面向高校师生的 AI 学习与教学平台。",
  },
  rateLimit: {
    requestsPerMinute: 120,
    maxTokensPerRequest: 8192,
  },
  security: {
    registrationOpen: true,
    emailVerification: false,
  },
  session: {
    sessionTimeoutMinutes: 60,
    maxConcurrentSessionsPerUser: 3,
    maxMessageLength: 32000,
  },
  storage: {
    maxUploadMb: 50,
    allowedFileTypes: {
      pdf: true,
      docx: true,
      txt: true,
      md: true,
      xlsx: true,
    },
    vectorDbType: "chromadb",
  },
};

function cloneDefault(): AdminUiConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as AdminUiConfig;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function mergeUiConfig(raw: unknown): AdminUiConfig {
  const out = cloneDefault();
  if (!isRecord(raw)) return out;

  if (isRecord(raw.site)) {
    if (typeof raw.site.platformName === "string")
      out.site.platformName = raw.site.platformName;
    if (typeof raw.site.description === "string")
      out.site.description = raw.site.description;
  }

  if (isRecord(raw.rateLimit)) {
    if (typeof raw.rateLimit.requestsPerMinute === "number")
      out.rateLimit.requestsPerMinute = raw.rateLimit.requestsPerMinute;
    if (typeof raw.rateLimit.maxTokensPerRequest === "number")
      out.rateLimit.maxTokensPerRequest = raw.rateLimit.maxTokensPerRequest;
  }

  if (isRecord(raw.security)) {
    if (typeof raw.security.registrationOpen === "boolean")
      out.security.registrationOpen = raw.security.registrationOpen;
    if (typeof raw.security.emailVerification === "boolean")
      out.security.emailVerification = raw.security.emailVerification;
  }

  if (isRecord(raw.session)) {
    if (typeof raw.session.sessionTimeoutMinutes === "number")
      out.session.sessionTimeoutMinutes = raw.session.sessionTimeoutMinutes;
    if (typeof raw.session.maxConcurrentSessionsPerUser === "number")
      out.session.maxConcurrentSessionsPerUser =
        raw.session.maxConcurrentSessionsPerUser;
    if (typeof raw.session.maxMessageLength === "number")
      out.session.maxMessageLength = raw.session.maxMessageLength;
  }

  if (isRecord(raw.storage)) {
    if (typeof raw.storage.maxUploadMb === "number")
      out.storage.maxUploadMb = raw.storage.maxUploadMb;
    if (typeof raw.storage.vectorDbType === "string") {
      const v = raw.storage.vectorDbType;
      if (v === "chromadb" || v === "milvus" || v === "faiss")
        out.storage.vectorDbType = v;
    }
    if (isRecord(raw.storage.allowedFileTypes)) {
      const a = raw.storage.allowedFileTypes;
      const keys: (keyof AllowedFileTypes)[] = [
        "pdf",
        "docx",
        "txt",
        "md",
        "xlsx",
      ];
      for (const k of keys) {
        if (typeof a[k] === "boolean") out.storage.allowedFileTypes[k] = a[k];
      }
    }
  }

  return out;
}

type ToastState = { kind: "success" | "error"; message: string } | null;

export default function AdminConfigPage() {
  const [site, setSite] = useState<SiteSettings>(DEFAULT_CONFIG.site);
  const [rateLimit, setRateLimit] = useState<RateLimitSettings>(
    DEFAULT_CONFIG.rateLimit,
  );
  const [security, setSecurity] = useState<SecuritySettings>(
    DEFAULT_CONFIG.security,
  );
  const [session, setSession] = useState<SessionSettings>(
    DEFAULT_CONFIG.session,
  );
  const [storage, setStorage] = useState<StorageSettings>(
    DEFAULT_CONFIG.storage,
  );

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessFlash, setSaveSuccessFlash] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const showToast = useCallback((kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitialLoading(true);
      try {
        const data = await api.get<unknown>("/admin/config");
        if (cancelled) return;
        const merged = mergeUiConfig(data);
        setSite(merged.site);
        setRateLimit(merged.rateLimit);
        setSecurity(merged.security);
        setSession(merged.session);
        setStorage(merged.storage);
      } catch {
        if (!cancelled) {
          const merged = cloneDefault();
          setSite(merged.site);
          setRateLimit(merged.rateLimit);
          setSecurity(merged.security);
          setSession(merged.session);
          setStorage(merged.storage);
        }
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyConfig = useCallback((cfg: AdminUiConfig) => {
    setSite(cfg.site);
    setRateLimit(cfg.rateLimit);
    setSecurity(cfg.security);
    setSession(cfg.session);
    setStorage(cfg.storage);
  }, []);

  const resetToDefaults = useCallback(() => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    applyConfig(cloneDefault());
    showToast("success", "已恢复为默认配置（尚未保存）");
  }, [applyConfig, logoPreview, showToast]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setLogoFileName(file.name);
  };

  const clearLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setLogoFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildPayload = (): AdminUiConfig => ({
    site,
    rateLimit,
    security,
    session,
    storage,
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccessFlash(false);
    try {
      await api.post<unknown>("/admin/config", buildPayload());
      setSaveSuccessFlash(true);
      window.setTimeout(() => setSaveSuccessFlash(false), 1400);
      showToast("success", "配置已保存");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : typeof e === "string" ? e : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleAllowed = (key: keyof AllowedFileTypes) => {
    setStorage((s) => ({
      ...s,
      allowedFileTypes: { ...s.allowedFileTypes, [key]: !s.allowedFileTypes[key] },
    }));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">
        系统配置
      </h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-8">
        管理平台展示信息、会话与存储策略；保存后由服务端持久化生效。
      </p>

      {initialLoading && (
        <div className="flex items-center gap-2 text-[13px] text-[--text-muted] mb-6">
          <Loader2
            className="h-4 w-4 animate-spin shrink-0 text-[--accent]"
            aria-hidden
          />
          正在从服务器加载配置…
        </div>
      )}

      <div className="space-y-6">
        <section className="sf-card rounded-[20px] p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[--text-primary] tracking-tight mb-4">
            站点设置
          </h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="platform-name"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                平台名称
              </label>
              <input
                id="platform-name"
                type="text"
                value={site.platformName}
                onChange={(e) =>
                  setSite((s) => ({ ...s, platformName: e.target.value }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px]"
              />
            </div>
            <div>
              <label
                htmlFor="platform-desc"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                描述
              </label>
              <textarea
                id="platform-desc"
                value={site.description}
                onChange={(e) =>
                  setSite((s) => ({ ...s, description: e.target.value }))
                }
                rows={4}
                className="sf-input w-full min-h-[100px] px-3 py-2.5 text-[13px] resize-y"
              />
            </div>
            <div>
              <p className="text-[12px] text-[--text-muted] mb-2">Logo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleLogoChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="sf-glass w-full rounded-[14px] overflow-hidden text-left shadow-[inset_0_0_0_1px_var(--chip-border)] hover:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-glow)] transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-6">
                  <div className="flex-shrink-0 w-20 h-20 rounded-[12px] bg-[--ring-warm]/30 flex items-center justify-center overflow-hidden shadow-[inset_0_0_0_1px_var(--chip-border)]">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-[--text-muted] px-2 text-center">
                        未选择
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[--text-primary] font-medium">
                      上传站点 Logo
                    </p>
                    <p className="text-[12px] text-[--text-muted] mt-1 truncate">
                      {logoFileName
                        ? `已选择：${logoFileName}`
                        : "支持 PNG、JPG、SVG；将在浏览器中本地预览"}
                    </p>
                  </div>
                </div>
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={clearLogo}
                  className="sf-btn-ghost mt-2 px-4 py-1.5 rounded-full text-[12px]"
                >
                  清除所选图片
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="sf-card rounded-[20px] p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[--text-primary] tracking-tight mb-4">
            限流设置
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="rpm"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                每分钟请求数
              </label>
              <input
                id="rpm"
                type="number"
                min={1}
                value={rateLimit.requestsPerMinute}
                onChange={(e) =>
                  setRateLimit((r) => ({
                    ...r,
                    requestsPerMinute: Number(e.target.value) || 0,
                  }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px] tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="max-tokens"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                单次最大 tokens
              </label>
              <input
                id="max-tokens"
                type="number"
                min={1}
                value={rateLimit.maxTokensPerRequest}
                onChange={(e) =>
                  setRateLimit((r) => ({
                    ...r,
                    maxTokensPerRequest: Number(e.target.value) || 0,
                  }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px] tabular-nums"
              />
            </div>
          </div>
        </section>

        <section className="sf-card rounded-[20px] p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[--text-primary] tracking-tight mb-4">
            安全设置
          </h2>
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 shadow-[inset_0_-1px_0_0_var(--border-subtle)]">
              <div>
                <p className="text-[14px] text-[--text-primary] font-medium">
                  注册开关
                </p>
                <p className="text-[12px] text-[--text-muted] mt-0.5">
                  关闭后新用户无法注册
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={security.registrationOpen}
                onClick={() =>
                  setSecurity((s) => ({
                    ...s,
                    registrationOpen: !s.registrationOpen,
                  }))
                }
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors shadow-[0_0_0_1px_var(--chip-border)] ${
                  security.registrationOpen
                    ? "bg-[--accent]"
                    : "bg-[--ring-warm]"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[--accent-text] shadow-[0_1px_3px_var(--shadow-avatar)] transition-transform ${
                    security.registrationOpen ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 pt-4">
              <div>
                <p className="text-[14px] text-[--text-primary] font-medium">
                  邮箱验证
                </p>
                <p className="text-[12px] text-[--text-muted] mt-0.5">
                  注册后需验证邮箱方可使用
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={security.emailVerification}
                onClick={() =>
                  setSecurity((s) => ({
                    ...s,
                    emailVerification: !s.emailVerification,
                  }))
                }
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors shadow-[0_0_0_1px_var(--chip-border)] ${
                  security.emailVerification
                    ? "bg-[--accent]"
                    : "bg-[--ring-warm]"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[--accent-text] shadow-[0_1px_3px_var(--shadow-avatar)] transition-transform ${
                    security.emailVerification
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="sf-card rounded-[20px] p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[--text-primary] tracking-tight mb-4">
            会话设置
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="session-timeout"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                会话超时（分钟）
              </label>
              <input
                id="session-timeout"
                type="number"
                min={1}
                value={session.sessionTimeoutMinutes}
                onChange={(e) =>
                  setSession((s) => ({
                    ...s,
                    sessionTimeoutMinutes: Number(e.target.value) || 0,
                  }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px] tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="max-sessions"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                每用户最大并发会话
              </label>
              <input
                id="max-sessions"
                type="number"
                min={1}
                value={session.maxConcurrentSessionsPerUser}
                onChange={(e) =>
                  setSession((s) => ({
                    ...s,
                    maxConcurrentSessionsPerUser: Number(e.target.value) || 0,
                  }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px] tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="max-msg-len"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                单条消息最大长度（字符）
              </label>
              <input
                id="max-msg-len"
                type="number"
                min={1}
                value={session.maxMessageLength}
                onChange={(e) =>
                  setSession((s) => ({
                    ...s,
                    maxMessageLength: Number(e.target.value) || 0,
                  }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px] tabular-nums"
              />
            </div>
          </div>
        </section>

        <section className="sf-card rounded-[20px] p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[--text-primary] tracking-tight mb-4">
            存储设置
          </h2>
          <div className="space-y-5">
            <div className="max-w-xs">
              <label
                htmlFor="max-upload"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                单文件上传上限（MB）
              </label>
              <input
                id="max-upload"
                type="number"
                min={1}
                value={storage.maxUploadMb}
                onChange={(e) =>
                  setStorage((s) => ({
                    ...s,
                    maxUploadMb: Number(e.target.value) || 0,
                  }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px] tabular-nums"
              />
            </div>
            <div>
              <p className="text-[12px] text-[--text-muted] mb-2.5">
                允许上传的文件类型
              </p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {(
                  [
                    ["pdf", "PDF"],
                    ["docx", "DOCX"],
                    ["txt", "TXT"],
                    ["md", "MD"],
                    ["xlsx", "XLSX"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="inline-flex items-center gap-2 cursor-pointer select-none text-[13px] text-[--text-primary]"
                  >
                    <input
                      type="checkbox"
                      checked={storage.allowedFileTypes[key]}
                      onChange={() => toggleAllowed(key)}
                      className="h-4 w-4 rounded border-[--chip-border] bg-transparent accent-[var(--accent)] focus:ring-2 focus:ring-[--accent]/30 focus:ring-offset-0"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="max-w-md">
              <label
                htmlFor="vector-db"
                className="block text-[12px] text-[--text-muted] mb-1.5"
              >
                向量数据库类型
              </label>
              <select
                id="vector-db"
                value={storage.vectorDbType}
                onChange={(e) =>
                  setStorage((s) => ({
                    ...s,
                    vectorDbType: e.target.value as VectorDbType,
                  }))
                }
                className="sf-input w-full px-3 py-2.5 text-[13px] appearance-auto"
              >
                <option value="chromadb">ChromaDB</option>
                <option value="milvus">Milvus</option>
                <option value="faiss">FAISS</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || initialLoading}
          className="sf-btn-primary px-8 py-2.5 rounded-full text-[13px] inline-flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          保存配置
        </button>
        {saveSuccessFlash && !saving && (
          <span
            className="inline-flex items-center gap-1.5 text-[13px] text-emerald-500 transition-opacity duration-300"
            aria-live="polite"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            已保存
          </span>
        )}
        <button
          type="button"
          onClick={resetToDefaults}
          disabled={saving || initialLoading}
          className="sf-btn-secondary px-6 py-2.5 rounded-full text-[13px] disabled:opacity-60"
        >
          重置默认
        </button>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[100] max-w-[min(100vw-2rem,22rem)] pointer-events-none"
          role="status"
        >
          <div
            className={`sf-glass rounded-[14px] px-4 py-3 text-[13px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] pointer-events-auto border ${
              toast.kind === "success"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-red-500/30 text-red-600 dark:text-red-400"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
