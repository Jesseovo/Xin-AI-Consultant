"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import { IconBook, IconBot, IconLogOut, IconMenu, IconMoon, IconSparkles, IconSun, IconUsers, IconX } from "@/components/ui-icons";

const NAV = [
  { href: "/teacher/dashboard", label: "工作台", Icon: IconSparkles },
  { href: "/teacher/knowledge", label: "知识库", Icon: IconBook },
  { href: "/teacher/bots", label: "我的机器人", Icon: IconBot },
  { href: "/teacher/students", label: "学生数据", Icon: IconUsers },
] as const;

function ThemeToggleBtn() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "浅色" : "深色"}
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

export default function TeacherAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!ready) return;
    if (!user || (!isDemo && user.role !== "teacher")) router.replace("/login");
  }, [ready, user, router, isDemo]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  if (!ready || !user || (!isDemo && user.role !== "teacher")) {
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
      {open && (
        <button type="button" aria-label="关闭" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`
          sf-glass fixed lg:static inset-y-0 left-0 z-50 w-[240px] shrink-0
          flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between h-14 px-3 shadow-[inset_0_-1px_0_0_rgba(208,205,195,0.22)]">
          <Link href="/teacher/dashboard" className="font-semibold tracking-tight text-[--text-primary]" onClick={() => setOpen(false)}>
            教师工作台
          </Link>
          <button type="button" className="lg:hidden p-2 rounded-xl hover:bg-[--bg-card-hover] transition-colors" onClick={() => setOpen(false)} aria-label="关闭">
            <IconX className="w-5 h-5 text-[--text-secondary]" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-[14px] transition-all duration-200 ${
                  active
                    ? "bg-[--accent]/12 text-[--accent] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_28%,transparent),0_0_24px_-4px_var(--accent-glow)]"
                    : "text-[--text-secondary] hover:bg-[--bg-card-hover]"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 shadow-[inset_0_1px_0_0_rgba(208,205,195,0.22)]">
          <Link href="/chat" className="block text-[13px] text-[--accent] text-center py-2 rounded-xl hover:bg-[--bg-card-hover] transition-colors" onClick={() => setOpen(false)}>
            返回学习端
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sf-glass sticky top-0 z-30 flex items-center gap-3 h-14 px-4 backdrop-blur-xl">
          <button type="button" className="lg:hidden p-2 rounded-xl hover:bg-[--bg-card-hover] transition-colors" onClick={() => setOpen(true)} aria-label="菜单">
            <IconMenu className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <img
              src="/images/student/default-avatar.png"
              alt="头像"
              className="w-8 h-8 rounded-full object-cover shadow-[0_0_0_1px_var(--border-subtle),0_4px_12px_var(--shadow-avatar)]"
            />
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-[13px] font-medium truncate max-w-[160px] tracking-tight">{user.display_name}</p>
              <p className="text-[11px] text-[--text-muted]">{user.department ?? "教师"}</p>
            </div>
            <ThemeToggleBtn />
            <button type="button" onClick={handleLogout} className="p-2 rounded-full hover:bg-[--bg-card-hover] text-[--text-secondary] transition-colors" aria-label="退出">
              <IconLogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
