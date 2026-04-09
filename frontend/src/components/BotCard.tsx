"use client";

export interface BotCardProps {
  id: number;
  name: string;
  description?: string;
  subjectTags?: string[];
  teacherName?: string;
  usageCount: number;
  onChat: (id: number) => void;
}


export default function BotCard({
  id,
  name,
  description,
  subjectTags = [],
  teacherName,
  usageCount,
  onChat,
}: BotCardProps) {
  return (
    <article className="sf-card p-5 flex flex-col h-full">
      <div className="flex gap-3 mb-3">
        <img
          src="/images/bots/default-bot.png"
          alt={name}
          className="flex-shrink-0 w-12 h-12 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-[--text-primary] truncate">{name}</h3>
          {teacherName && (
            <p className="text-[12px] text-[--text-secondary] mt-0.5 truncate">教师：{teacherName}</p>
          )}
        </div>
      </div>

      {description && (
        <p className="text-[13px] text-[--text-secondary] leading-relaxed line-clamp-3 mb-3 flex-1">{description}</p>
      )}

      {subjectTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {subjectTags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2 py-0.5 rounded-full border"
              style={{
                background: "var(--chip-bg)",
                borderColor: "var(--chip-border)",
                color: "var(--text-secondary)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-[--border-subtle]">
        <span className="text-[12px] text-[--text-muted]">使用 {usageCount} 次</span>
        <button
          type="button"
          onClick={() => onChat(id)}
          className="text-[13px] font-medium px-4 py-2 rounded-xl text-[--accent-text] transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          开始对话
        </button>
      </div>
    </article>
  );
}
