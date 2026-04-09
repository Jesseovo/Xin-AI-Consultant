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

  const isRegister = tab === "register";

  return (
    <div className="min-h-screen flex bg-[--bg-primary]">
      {/* Left illustration */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="/images/platform/login-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-6">
            <Link href="/" className="inline-block">
              <img src="/images/platform/logo.png" alt="夹心" className="w-14 h-14 mx-auto mb-2 object-contain" />
            </Link>
            <h1 className="text-[20px] font-semibold text-[--text-primary]">夹心</h1>
            <p className="text-[13px] text-[--text-secondary]">智能教学平台</p>
          </div>

          {/* Tab bar */}
          <div className="flex rounded-xl overflow-hidden border border-[--border-subtle] mb-5">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); }}
              className={`flex-1 py-2.5 text-[14px] font-medium transition-colors ${
                tab === "login"
                  ? "bg-[--accent] text-[--accent-text]"
                  : "bg-[--input-bg] text-[--text-secondary] hover:text-[--text-primary]"
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex-1 py-2.5 text-[14px] font-medium transition-colors ${
                tab === "register"
                  ? "bg-[--accent] text-[--accent-text]"
                  : "bg-[--input-bg] text-[--text-secondary] hover:text-[--text-primary]"
              }`}
            >
              注册
            </button>
          </div>

          {/* Unified form card */}
          <form
            onSubmit={isRegister ? submitRegister : submitLogin}
            className="rounded-2xl border border-[--border-subtle] bg-white/60 dark:bg-white/5 p-6 space-y-3.5"
          >
            {error && (
              <div className="px-3 py-2 rounded-lg text-[13px] text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/20">
                {error}
              </div>
            )}

            {/* Username — always visible */}
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">用户名</label>
              <input
                className="sf-input w-full px-3.5 py-2.5 text-[14px]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="请输入用户名"
                required
              />
            </div>

            {/* Password — always visible */}
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">密码</label>
              <input
                type="password"
                className="sf-input w-full px-3.5 py-2.5 text-[14px]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                placeholder="请输入密码"
                required
              />
            </div>

            {/* Register-only fields */}
            {isRegister && (
              <>
                <div>
                  <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">显示名称</label>
                  <input
                    className="sf-input w-full px-3.5 py-2.5 text-[14px]"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="你的昵称"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">角色</label>
                    <select
                      className="sf-input w-full px-3.5 py-2.5 text-[14px]"
                      value={role}
                      onChange={(e) => setRole(e.target.value as "student" | "teacher")}
                    >
                      <option value="student">学生</option>
                      <option value="teacher">教师</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">院系</label>
                    <input
                      className="sf-input w-full px-3.5 py-2.5 text-[14px]"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="计算机学院"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[--text-secondary] mb-1">专业</label>
                  <input
                    className="sf-input w-full px-3.5 py-2.5 text-[14px]"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    placeholder="软件工程"
                    required
                  />
                </div>
              </>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[--accent] text-[--accent-text] text-[15px] font-medium disabled:opacity-50 transition-opacity"
            >
              {loading ? "处理中…" : isRegister ? "注册" : "登录"}
            </button>

            <p className="text-center text-[12px] text-[--text-muted] pt-1">
              <Link href="/" className="text-[--accent] hover:underline">返回首页</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
