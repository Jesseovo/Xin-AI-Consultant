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
      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[--bg-card-hover]"
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

  return (
    <div className="min-h-screen flex bg-[--bg-primary]">
      {/* Left side — login-bg illustration (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="/images/platform/login-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          {/* Logo + title */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <img
                src="/images/platform/logo.png"
                alt="夹心 Logo"
                className="w-16 h-16 mx-auto mb-3 object-contain"
              />
            </Link>
            <h1 className="text-[22px] font-semibold tracking-tight text-[--text-primary]">
              夹心
            </h1>
            <p className="mt-1 text-[14px] text-[--text-secondary]">智能教学平台</p>
          </div>

          {/* Tab switcher */}
          <div
            className="rounded-2xl p-1 mb-6 flex border border-[--border-subtle] bg-[--bg-card]/60"
            role="tablist"
            aria-label="登录或注册"
          >
            <button
              type="button"
              role="tab"
              id="auth-tab-login"
              aria-selected={tab === "login"}
              aria-controls="auth-panel-login"
              tabIndex={tab === "login" ? 0 : -1}
              onClick={() => { setTab("login"); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                tab === "login" ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:bg-[--bg-card-hover]"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              id="auth-tab-register"
              aria-selected={tab === "register"}
              aria-controls="auth-panel-register"
              tabIndex={tab === "register" ? 0 : -1}
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                tab === "register" ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:bg-[--bg-card-hover]"
              }`}
            >
              注册
            </button>
          </div>

          {/* Form card */}
          <div className="rounded-2xl p-6 sm:p-8 border border-[--border-subtle] bg-[--bg-card]/60 backdrop-blur-xl shadow-lg shadow-[--accent]/5">
            {error && (
              <div
                className="mb-4 px-3 py-2 rounded-xl text-[13px] text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/20"
                role="alert"
              >
                {error}
              </div>
            )}

            {tab === "login" ? (
              <form
                id="auth-panel-login"
                role="tabpanel"
                aria-labelledby="auth-tab-login"
                onSubmit={submitLogin}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="login-username" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    用户名
                  </label>
                  <input
                    id="login-username"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    密码
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[--accent] text-white text-[15px] font-medium disabled:opacity-50 transition-opacity shadow-md shadow-[--accent]/20"
                >
                  {loading ? "处理中…" : "登录"}
                </button>
              </form>
            ) : (
              <form
                id="auth-panel-register"
                role="tabpanel"
                aria-labelledby="auth-tab-register"
                onSubmit={submitRegister}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="register-username" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    用户名
                  </label>
                  <input
                    id="register-username"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-password" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    密码
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-display-name" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    显示名称
                  </label>
                  <input
                    id="register-display-name"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-role" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    角色
                  </label>
                  <select
                    id="register-role"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={role}
                    onChange={(e) => setRole(e.target.value as "student" | "teacher")}
                  >
                    <option value="student">学生</option>
                    <option value="teacher">教师</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="register-department" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    院系
                  </label>
                  <input
                    id="register-department"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="register-major" className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">
                    专业
                  </label>
                  <input
                    id="register-major"
                    className="sf-input w-full px-4 py-3 text-[15px] border border-[--border-subtle]"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[--accent] text-white text-[15px] font-medium disabled:opacity-50 transition-opacity shadow-md shadow-[--accent]/20"
                >
                  {loading ? "处理中…" : "注册"}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-[13px] text-[--text-muted]">
              <Link href="/" className="text-[--accent] hover:underline">
                返回首页
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
