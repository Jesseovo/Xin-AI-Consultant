"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[--bg-card-hover]"
    >
      {theme === "dark" ? (
        <IconSun className="w-[18px] h-[18px] text-[--text-secondary]" />
      ) : (
        <IconMoon className="w-[18px] h-[18px] text-[--text-secondary]" />
      )}
    </button>
  );
}

export default function TeacherAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== "teacher") router.replace("/login");
  }, [ready, user, router]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  if (!ready || !user || user.role !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[--bg-primary] text-[--text-secondary] text-sm">
        加载中…
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
          fixed lg:static inset-y-0 left-0 z-50 w-[240px] shrink-0 border-r border-[--border-subtle] bg-[--bg-elevated] backdrop-blur-xl
          flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="flex items-center justify-between h-14 px-3 border-b border-[--border-subtle]">
          <Link href="/teacher/dashboard" className="font-semibold text-[--text-primary]" onClick={() => setOpen(false)}>
            教师工作台
          </Link>
          <button type="button" className="lg:hidden p-2 rounded-lg hover:bg-[--bg-card-hover]" onClick={() => setOpen(false)} aria-label="关闭">
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] ${
                  active ? "bg-[--accent]/15 text-[--accent]" : "text-[--text-secondary] hover:bg-[--bg-card-hover]"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[--border-subtle]">
          <Link href="/chat" className="block text-[13px] text-[--accent] text-center py-2" onClick={() => setOpen(false)}>
            返回学习端
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-[--border-subtle] bg-[--bg-primary]/85 backdrop-blur-md">
          <button type="button" className="lg:hidden p-2 rounded-lg hover:bg-[--bg-card-hover]" onClick={() => setOpen(true)} aria-label="菜单">
            <IconMenu className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/25 to-cyan-500/25 border border-[--border-subtle]" />
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-[13px] font-medium truncate max-w-[160px]">{user.display_name}</p>
              <p className="text-[11px] text-[--text-muted]">{user.department ?? "教师"}</p>
            </div>
            <ThemeToggleBtn />
            <button type="button" onClick={handleLogout} className="p-2 rounded-full hover:bg-[--bg-card-hover] text-[--text-secondary]" aria-label="退出">
              <IconLogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
