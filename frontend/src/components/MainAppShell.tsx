"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import {
  IconLogOut,
  IconMenu,
  IconMoon,
  IconPanelLeft,
  IconSun,
  IconX,
} from "@/components/ui-icons";

const NAV = [
  { href: "/chat", label: "对话", img: "/images/modes/chat.png" },
  { href: "/bots", label: "导师机器人", img: "/images/bots/default-bot.png" },
  { href: "/quiz", label: "测验", img: "/images/modes/quiz.png" },
  { href: "/notebook", label: "笔记本", img: "/images/modes/notebook.png" },
  { href: "/learning", label: "学习", img: "/images/modes/guided.png" },
] as const;

function ThemeToggleBtn() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
      className="sf-btn-ghost w-9 h-9 flex items-center justify-center rounded-full shrink-0"
    >
      {theme === "dark" ? (
        <IconSun className="w-[18px] h-[18px] text-[--text-secondary]" />
      ) : (
        <IconMoon className="w-[18px] h-[18px] text-[--text-secondary]" />
      )}
    </button>
  );
}

export default function MainAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg-primary]">
        <div className="flex flex-col items-center gap-4">
          <img src="/images/platform/logo.png" alt="" className="w-12 h-12 object-contain animate-pulse opacity-60" />
          <div className="sf-skeleton h-3 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[--bg-primary] text-[--text-primary]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="关闭菜单"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden transition-opacity duration-300 ease-out"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col sf-glass
          shadow-[0_8px_40px_-16px_rgba(20,20,19,0.12),0_0_0_1px_var(--border-subtle)]
          w-[260px] shrink-0
          transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform
          rounded-r-2xl lg:rounded-none
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
        `}
      >
        <div
          className={`flex items-center justify-between gap-1.5 px-3 min-h-[3.25rem] py-2.5 shadow-[0_12px_28px_-18px_rgba(20,20,19,0.12)] ${collapsed ? "lg:px-2" : ""}`}
        >
          <Link
            href="/"
            className={`flex items-center gap-2 min-w-0 font-semibold tracking-tight truncate rounded-xl px-1 py-0.5 -mx-0.5 transition-colors duration-200 sf-btn-ghost hover:bg-[--bg-card-hover]/80 ${collapsed ? "lg:hidden" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <img
              src="/images/platform/logo.png"
              alt=""
              className="w-7 h-7 object-contain shrink-0 drop-shadow-[0_0_14px_rgba(201,100,66,0.35),0_4px_12px_rgba(90,62,34,0.12)]"
            />
            <span className="bg-gradient-to-r from-[#6b5344] via-[--accent] to-[#a85a3e] bg-clip-text text-transparent">
              夹心
            </span>
          </Link>
          <button
            type="button"
            className="hidden lg:flex sf-btn-ghost w-9 h-9 items-center justify-center rounded-full shrink-0"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            <IconPanelLeft className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <button
            type="button"
            className="lg:hidden sf-btn-ghost w-9 h-9 flex items-center justify-center rounded-full shrink-0"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭"
          >
            <IconX className="w-5 h-5 text-[--text-secondary]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map(({ href, label, img }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  group flex items-center gap-2.5 rounded-[11px] px-2.5 py-2 text-[14px] leading-tight
                  transition-[background-color,color,box-shadow] duration-200 ease-out
                  ${active
                    ? "bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[--accent] font-semibold shadow-[0_0_0_1px_var(--accent-glow)]"
                    : "text-[--text-secondary] hover:bg-[--bg-card-hover] hover:text-[--text-primary]"
                  }
                  ${collapsed ? "lg:justify-center lg:px-2" : ""}
                `}
                title={collapsed ? label : undefined}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow] duration-200 ease-out ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
                      : "bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] shadow-[0_0_0_1px_rgba(208,205,195,0.2)]"
                  }`}
                >
                  <img src={img} alt="" className="w-[18px] h-[18px] object-contain" />
                </span>
                <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {user.role === "teacher" && (
          <div
            className={`p-3 pt-2 shadow-[inset_0_1px_0_0_rgba(208,205,195,0.35)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${collapsed ? "lg:px-2" : ""}`}
          >
            <Link
              href="/teacher/dashboard"
              title="教师工作台"
              onClick={() => setSidebarOpen(false)}
              className={`sf-btn-secondary block rounded-xl py-2.5 text-center text-[13px] font-medium text-[--text-primary] hover:no-underline ${collapsed ? "lg:px-0" : ""}`}
            >
              <span className={collapsed ? "lg:hidden" : ""}>教师工作台</span>
              <span className={`hidden ${collapsed ? "lg:inline" : ""}`}>教</span>
            </Link>
          </div>
        )}
        {user.role === "admin" && (
          <div className={`p-3 pt-2 shadow-[inset_0_1px_0_0_rgba(208,205,195,0.35)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] ${collapsed ? "lg:px-2" : ""}`}>
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className={`sf-btn-secondary block rounded-xl py-2.5 text-center text-[13px] font-medium text-[--text-primary] ${collapsed ? "lg:px-0" : ""}`}
            >
              <span className={collapsed ? "lg:hidden" : ""}>系统管理</span>
            </Link>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center gap-2.5 px-3 sm:px-4 h-14 sf-glass shadow-[0_8px_32px_-12px_rgba(20,20,19,0.1),0_0_0_1px_var(--border-subtle)]">
          <button
            type="button"
            className="lg:hidden sf-btn-ghost w-9 h-9 flex items-center justify-center rounded-full shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开菜单"
          >
            <IconMenu className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <img
              src="/images/student/default-avatar.png"
              alt="头像"
              className="w-8 h-8 rounded-full shrink-0 object-cover shadow-[0_0_0_1px_var(--ring-warm),0_4px_12px_var(--shadow-avatar)]"
            />
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-[13px] font-medium text-[--text-primary] truncate max-w-[140px]">
                {user.display_name}
              </p>
              <p className="mt-0.5 flex justify-end">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-[--text-secondary] bg-[--chip-bg] shadow-[0_0_0_1px_var(--chip-border)]">
                  {user.role === "teacher" ? "教师" : user.role === "admin" ? "管理员" : "学生"}
                </span>
              </p>
            </div>
            <ThemeToggleBtn />
            <button
              type="button"
              onClick={handleLogout}
              className="sf-btn-ghost w-9 h-9 flex items-center justify-center rounded-full shrink-0 text-[--text-secondary]"
              aria-label="退出登录"
            >
              <IconLogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
