"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-store";
import { useTheme } from "@/lib/theme";
import { IconCpu, IconLogOut, IconMenu, IconMoon, IconSettings, IconSparkles, IconSun, IconUsers, IconX } from "@/components/ui-icons";

const NAV = [
  { href: "/admin" as const, label: "总览", Icon: IconSparkles, end: true },
  { href: "/admin/config" as const, label: "系统配置", Icon: IconSettings, end: false },
  { href: "/admin/users" as const, label: "用户", Icon: IconUsers, end: false },
  { href: "/admin/models" as const, label: "模型", Icon: IconCpu, end: false },
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
          sf-glass fixed lg:static inset-y-0 left-0 z-50 w-[220px] shrink-0 flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="h-14 px-3 flex items-center justify-between shadow-[inset_0_-1px_0_0_rgba(208,205,195,0.22)]">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <img src="/images/admin/admin-logo.png" alt="" className="w-6 h-6 object-contain shadow-[0_0_0_1px_rgba(208,205,195,0.2)] rounded-md" />
            系统管理
          </span>
          <button type="button" className="lg:hidden p-2 rounded-xl hover:bg-[--bg-card-hover] transition-colors" onClick={() => setOpen(false)} aria-label="关闭">
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
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sf-glass sticky top-0 z-30 h-14 px-4 flex items-center gap-3 backdrop-blur-xl">
          <button type="button" className="lg:hidden p-2 rounded-xl hover:bg-[--bg-card-hover] transition-colors" onClick={() => setOpen(true)} aria-label="菜单">
            <IconMenu className="w-5 h-5 text-[--text-secondary]" />
          </button>
          <div className="flex-1" />
          <span className="text-[13px] text-[--text-secondary] hidden sm:inline tracking-tight">{user.display_name}</span>
          <ThemeToggleBtn />
          <button type="button" onClick={handleLogout} className="p-2 rounded-full hover:bg-[--bg-card-hover] transition-colors" aria-label="退出">
            <IconLogOut className="w-[18px] h-[18px] text-[--text-secondary]" />
          </button>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
