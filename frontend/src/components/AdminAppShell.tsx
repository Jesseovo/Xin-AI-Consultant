"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import { IconCpu, IconLogOut, IconMenu, IconMoon, IconSettings, IconSparkles, IconSun, IconUsers, IconX } from "@/components/ui-icons";

const NAV = [
  { href: "/admin", label: "总览", Icon: IconSparkles, end: true },
  { href: "/admin/config", label: "系统配置", Icon: IconSettings },
  { href: "/admin/users", label: "用户", Icon: IconUsers },
  { href: "/admin/models", label: "模型", Icon: IconCpu },
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

export default function AdminAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const isDemo = user?.id === "demo";

  useEffect(() => {
    if (!ready) return;
    if (!user || (!isDemo && user.role !== "admin")) router.replace("/login");
  }, [ready, user, router, isDemo]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  if (!ready || !user || (!isDemo && user.role !== "admin")) {
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
          fixed lg:static inset-y-0 left-0 z-50 w-[220px] shrink-0 border-r border-[--border-subtle] bg-[--bg-elevated] backdrop-blur-xl flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="h-14 px-3 flex items-center justify-between border-b border-[--border-subtle]">
          <span className="flex items-center gap-2 font-semibold">
            <img src="/images/admin/admin-logo.png" alt="" className="w-6 h-6 object-contain" />
            系统管理
          </span>
          <button type="button" className="lg:hidden p-2 rounded-lg hover:bg-[--bg-card-hover]" onClick={() => setOpen(false)} aria-label="关闭">
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {NAV.map(({ href, label, Icon, end }) => {
            const active = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-30 h-14 px-4 flex items-center gap-3 border-b border-[--border-subtle] bg-[--bg-primary]/85 backdrop-blur-md">
          <button type="button" className="lg:hidden p-2 rounded-lg hover:bg-[--bg-card-hover]" onClick={() => setOpen(true)} aria-label="菜单">
            <IconMenu className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div className="flex-1" />
          <span className="text-[13px] text-[--text-secondary] hidden sm:inline">{user.display_name}</span>
          <ThemeToggleBtn />
          <button type="button" onClick={handleLogout} className="p-2 rounded-full hover:bg-[--bg-card-hover]" aria-label="退出">
            <IconLogOut className="w-[18px] h-[18px] text-[--text-secondary]" />
          </button>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
