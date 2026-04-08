"use client";

import { useTheme } from "@/lib/theme";

export interface TopBarProps {
  title?: string;
  onMenuToggle?: () => void;
  userDisplayName?: string;
  onLogout?: () => void;
}

export default function TopBar({
  title = "Xin AI",
  onMenuToggle,
  userDisplayName = "访客",
  onLogout,
}: TopBarProps) {
  const { theme, toggle } = useTheme();

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 h-14 shrink-0 sf-glass border-b border-[--border-subtle]"
    >
      <div className="flex items-center gap-3 min-w-0">
        {onMenuToggle && (
          <button
            type="button"
            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-[--text-primary] hover:bg-[--bg-card-hover] transition-colors"
            onClick={onMenuToggle}
            aria-label="打开菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="text-[15px] sm:text-[16px] font-semibold text-[--text-primary] truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "切换到浅色" : "切换到深色"}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[--bg-card-hover] transition-colors text-[--text-secondary]"
        >
          {theme === "dark" ? (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
              />
            </svg>
          ) : (
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
              />
            </svg>
          )}
        </button>

        <span className="hidden sm:inline text-[13px] text-[--text-secondary] max-w-[120px] truncate px-1">
          {userDisplayName}
        </span>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-[13px] font-medium px-3 py-2 rounded-xl text-[--accent] hover:bg-[--bg-card-hover] transition-colors"
          >
            退出
          </button>
        )}
      </div>
    </header>
  );
}
