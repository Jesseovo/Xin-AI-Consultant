"use client";

const MODES: { id: string; label: string }[] = [
  { id: "chat", label: "对话" },
  { id: "deep_solve", label: "深度解题" },
  { id: "quiz", label: "测验" },
  { id: "research", label: "研究" },
  { id: "guided", label: "引导" },
];

export interface ModeSelectorProps {
  current: string;
  onChange: (mode: string) => void;
}

export default function ModeSelector({ current, onChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 w-full" role="tablist" aria-label="对话模式">
      {MODES.map((m) => {
        const active = current === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m.id)}
            className="px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-medium transition-colors border"
            style={{
              background: active ? "var(--accent)" : "var(--chip-bg)",
              borderColor: active ? "var(--accent)" : "var(--chip-border)",
              color: active ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
