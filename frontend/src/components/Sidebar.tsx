"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

export interface SidebarItem {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  header?: ReactNode;
  footer?: ReactNode;
  /** 受控模式：与 TopBar 菜单按钮联动时传入 */
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ items, header, footer, open: controlledOpen, onClose }: SidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const mobileOpen = isControlled ? controlledOpen : internalOpen;

  const closeMobile = useCallback(() => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onClose]);

  const openMobile = useCallback(() => {
    if (!isControlled) setInternalOpen(true);
  }, [isControlled]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  return (
    <>
      {!isControlled && (
        <button
          type="button"
          className="lg:hidden fixed top-3 left-3 z-[60] w-10 h-10 rounded-xl sf-glass flex items-center justify-center text-[--text-primary]"
          onClick={openMobile}
          aria-label="打开导航"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/35 z-[55] lg:hidden"
          aria-hidden
          onClick={closeMobile}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-[56] w-72 flex flex-col
          transition-transform duration-300 ease-out lg:translate-x-0
          sf-glass lg:border-r lg:border-[--border-subtle]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ borderRightWidth: "1px" }}
      >
        {header != null && <div className="p-4 border-b border-[--border-subtle] shrink-0">{header}</div>}

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" aria-label="主导航">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${
                item.active
                  ? "bg-[--accent]/15 text-[--accent] font-medium"
                  : "text-[--text-primary] hover:bg-[--bg-card-hover]"
              }`}
            >
              <span className="text-lg w-7 text-center flex-shrink-0" aria-hidden>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        {footer != null && (
          <div className="p-3 border-t border-[--border-subtle] shrink-0">{footer}</div>
        )}
      </aside>
    </>
  );
}
