"use client";

import { useState } from "react";

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

export default function AdminConfigPage() {
  const [site, setSite] = useState<SiteSettings>({
    platformName: "智学助手",
    description: "面向高校师生的 AI 学习与教学平台。",
  });
  const [rateLimit, setRateLimit] = useState<RateLimitSettings>({
    requestsPerMinute: 120,
    maxTokensPerRequest: 8192,
  });
  const [security, setSecurity] = useState<SecuritySettings>({
    registrationOpen: true,
    emailVerification: false,
  });
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">
        系统配置
      </h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-8">
        站点信息、限流与安全策略（本地演示，保存为模拟）
      </p>

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
              <button
                type="button"
                className="sf-glass w-full rounded-[14px] py-10 px-4 text-center text-[13px] text-[--text-secondary] shadow-[inset_0_0_0_1px_var(--chip-border)] hover:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-glow)] transition-shadow"
              >
                点击上传 Logo（演示）
              </button>
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
                <p className="text-[14px] text-[--text-primary] font-medium">注册开关</p>
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
                  security.registrationOpen ? "bg-[--accent]" : "bg-[--ring-warm]"
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
                <p className="text-[14px] text-[--text-primary] font-medium">邮箱验证</p>
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
                  security.emailVerification ? "bg-[--accent]" : "bg-[--ring-warm]"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[--accent-text] shadow-[0_1px_3px_var(--shadow-avatar)] transition-transform ${
                    security.emailVerification ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="sf-btn-primary px-8 py-2.5 rounded-full text-[13px]"
        >
          保存配置
        </button>
        {savedFlash && (
          <span className="text-[12px] text-[--accent-secondary]">已保存（演示）</span>
        )}
      </div>
    </div>
  );
}
