"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getDashboardPath, useAuth, type RegisterPayload } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import { IconMoon, IconSun } from "@/components/ui-icons";

type Tab = "login" | "register";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[--bg-card-hover] shadow-[0_0_0_1px_var(--border-subtle)]"
    >
      {theme === "dark" ? (
        <IconSun className="w-[18px] h-[18px] text-[--text-secondary]" />
      ) : (
        <IconMoon className="w-[18px] h-[18px] text-[--text-secondary]" />
      )}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login, register } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [department, setDepartment] = useState("");
  const [major, setMajor] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(getDashboardPath(user.role));
  }, [ready, user, router]);

  const submitLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const u = await login(username.trim(), password);
        router.replace(getDashboardPath(u.role));
      } catch (err) {
        setError(err instanceof Error ? err.message : "登录失败");
      } finally {
        setLoading(false);
      }
    },
    [login, username, password, router]
  );

  const submitRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const payload: RegisterPayload = {
          username: username.trim(),
          password,
          display_name: displayName.trim(),
          role,
          department: department.trim(),
          major: major.trim(),
        };
        const u = await register(payload);
        router.replace(getDashboardPath(u.role));
      } catch (err) {
        setError(err instanceof Error ? err.message : "注册失败");
      } finally {
        setLoading(false);
      }
    },
    [register, username, password, displayName, role, department, major, router]
  );

  const isRegister = tab === "register";

  return (
    <div className="min-h-screen flex bg-[--bg-primary]">
      {/* Left: full-bleed hero image */}
      <div className="hidden lg:block lg:w-1/2 min-h-screen relative overflow-hidden">
        <img
          src="/images/platform/login-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(245, 244, 237, 0.82) 0%, rgba(201, 100, 66, 0.12) 42%, rgba(94, 93, 89, 0.35) 100%)",
          }}
        />
        <div className="absolute inset-0 sf-glow opacity-80 mix-blend-soft-light pointer-events-none" aria-hidden />
      </div>

      {/* Right: form */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:py-14 lg:px-10 relative min-h-screen">
        <div className="absolute top-5 right-5 z-10">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10 sm:mb-12">
            <Link
              href="/"
              className="inline-flex flex-col items-center transition-transform duration-300 hover:scale-[1.02]"
            >
              <span className="inline-flex items-center justify-center rounded-[1.25rem] sf-glow p-2 mb-4">
                <img
                  src="/images/platform/logo.png"
                  alt="夹心"
                  className="w-[4.5rem] h-[4.5rem] object-contain"
                />
              </span>
            </Link>
            <h1 className="text-[22px] font-semibold tracking-tight text-[--text-primary]">夹心</h1>
            <p className="text-[13px] text-[--text-secondary] mt-2">智能教学平台</p>
          </div>

          {/* Tab switcher — pills */}
          <div
            className="flex p-1 rounded-full mb-8 shadow-[inset_0_1px_3px_rgba(20,20,19,0.06)]"
            style={{ background: "var(--input-bg)" }}
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "login"}
              onClick={() => {
                setTab("login");
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-[14px] font-medium transition-all duration-300 ${
                tab === "login" ? "sf-btn-primary" : "sf-btn-ghost"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "register"}
              onClick={() => {
                setTab("register");
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-full text-[14px] font-medium transition-all duration-300 ${
                tab === "register" ? "sf-btn-primary" : "sf-btn-ghost"
              }`}
            >
              注册
            </button>
          </div>

          <form
            onSubmit={isRegister ? submitRegister : submitLogin}
            className="sf-glass rounded-[20px] p-7 sm:p-8 space-y-5 sm:space-y-6 shadow-[0_24px_64px_-20px_rgba(20,20,19,0.12),0_8px_32px_-12px_rgba(201,100,66,0.08)]"
          >
            {error && (
              <div className="px-4 py-3 rounded-xl text-[13px] text-red-700 dark:text-red-300 bg-red-500/10 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.12)]">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-2 tracking-tight">
                  用户名
                </label>
                <input
                  className="sf-input w-full px-4 py-3.5 text-[14px]"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="请输入用户名"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[--text-secondary] mb-2 tracking-tight">
                  密码
                </label>
                <input
                  type="password"
                  className="sf-input w-full px-4 py-3.5 text-[14px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder="请输入密码"
                  required
                />
              </div>
            </div>

            {isRegister && (
              <div className="space-y-5 pt-1">
                <div>
                  <label className="block text-[12px] font-medium text-[--text-secondary] mb-2 tracking-tight">
                    显示名称
                  </label>
                  <input
                    className="sf-input w-full px-4 py-3.5 text-[14px]"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="你的昵称"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[12px] font-medium text-[--text-secondary] mb-2 tracking-tight">
                      角色
                    </label>
                    <select
                      className="sf-input w-full px-4 py-3.5 text-[14px]"
                      value={role}
                      onChange={(e) => setRole(e.target.value as "student" | "teacher")}
                    >
                      <option value="student">学生</option>
                      <option value="teacher">教师</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[--text-secondary] mb-2 tracking-tight">
                      院系
                    </label>
                    <input
                      className="sf-input w-full px-4 py-3.5 text-[14px]"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="计算机学院"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[--text-secondary] mb-2 tracking-tight">
                    专业
                  </label>
                  <input
                    className="sf-input w-full px-4 py-3.5 text-[14px]"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="软件工程"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="sf-btn-primary w-full py-3.5 text-[15px] mt-2 rounded-full"
            >
              {loading ? "处理中…" : isRegister ? "注册" : "登录"}
            </button>

            <p className="text-center text-[12px] text-[--text-muted] pt-2">
              <Link href="/" className="text-[--accent] hover:underline">
                返回首页
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
