"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import {
  IconBook,
  IconBot,
  IconLogOut,
  IconMenu,
  IconMoon,
  IconPanelLeft,
  IconSparkles,
  IconSun,
  IconX,
} from "@/components/ui-icons";

const NAV = [
  { href: "/chat", label: "对话", Icon: IconSparkles },
  { href: "/bots", label: "导师机器人", Icon: IconBot },
  { href: "/quiz", label: "测验", Icon: IconBook },
  { href: "/notebook", label: "笔记本", Icon: IconBook },
  { href: "/writer", label: "写作", Icon: IconBook },
  { href: "/learning", label: "学习", Icon: IconBook },
] as const;

function ThemeToggleBtn() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[--bg-card-hover] transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-[--bg-primary] text-[--text-secondary] text-sm">
        加载中…
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
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col border-r transition-transform duration-300 ease-out
          bg-[--bg-elevated] backdrop-blur-xl border-[--border-subtle]
          w-[260px] shrink-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
        `}
      >
        <div className="flex items-center justify-between gap-2 px-3 h-14 border-b border-[--border-subtle]">
          <Link
            href="/"
            className={`flex items-center gap-2 font-semibold tracking-tight text-[--text-primary] truncate ${collapsed ? "lg:hidden" : ""}`}
            onClick={() => setSidebarOpen(false)}
          >
            <img src="/images/platform/logo.png" alt="" className="w-7 h-7 object-contain shrink-0" />
            <span>夹心</span>
          </Link>
          <button
            type="button"
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg hover:bg-[--bg-card-hover]"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            <IconPanelLeft className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <button
            type="button"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[--bg-card-hover]"
            onClick={() => setSidebarOpen(false)}
            aria-label="关闭"
          >
            <IconX className="w-5 h-5 text-[--text-secondary]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors
                  ${active ? "bg-[--accent]/15 text-[--accent]" : "text-[--text-secondary] hover:bg-[--bg-card-hover]"}
                  ${collapsed ? "lg:justify-center lg:px-2" : ""}
                `}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0 opacity-90" />
                <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </nav>

        {user.role === "teacher" && (
          <div className={`p-3 border-t border-[--border-subtle] ${collapsed ? "lg:px-2" : ""}`}>
            <Link
              href="/teacher/dashboard"
              title="教师工作台"
              onClick={() => setSidebarOpen(false)}
              className={`block text-center sf-card py-2 text-[13px] text-[--accent] hover:no-underline ${collapsed ? "lg:px-0" : ""}`}
            >
              <span className={collapsed ? "lg:hidden" : ""}>教师工作台</span>
              <span className={`hidden ${collapsed ? "lg:inline" : ""}`}>教</span>
            </Link>
          </div>
        )}
        {user.role === "admin" && (
          <div className={`p-3 border-t border-[--border-subtle] ${collapsed ? "lg:px-2" : ""}`}>
            <Link
              href="/admin"
              onClick={() => setSidebarOpen(false)}
              className="block text-center sf-card py-2 text-[13px] text-[--accent]"
            >
              <span className={collapsed ? "lg:hidden" : ""}>系统管理</span>
            </Link>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b border-[--border-subtle] bg-[--bg-primary]/80 backdrop-blur-md">
          <button
            type="button"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[--bg-card-hover]"
            onClick={() => setSidebarOpen(true)}
            aria-label="打开菜单"
          >
            <IconMenu className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <img
              src="/images/student/default-avatar.png"
              alt="头像"
              className="w-8 h-8 rounded-full border border-[--border-subtle] shrink-0 object-cover"
            />
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-[13px] font-medium text-[--text-primary] truncate max-w-[140px]">
                {user.display_name}
              </p>
              <p className="text-[11px] text-[--text-muted]">
                {user.role === "teacher" ? "教师" : user.role === "admin" ? "管理员" : "学生"}
              </p>
            </div>
            <ThemeToggleBtn />
            <button
              type="button"
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[--bg-card-hover] text-[--text-secondary]"
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
