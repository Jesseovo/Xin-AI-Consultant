"use client";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, description, actionLabel, onAction, image }: EmptyStateProps & { image?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 max-w-md mx-auto">
      <img
        src={image || "/images/platform/empty-chat.png"}
        alt={title}
        className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl mb-6 object-contain"
      />
      <h2 className="text-[18px] sm:text-[20px] font-semibold text-[--text-primary] mb-2">{title}</h2>
      <p className="text-[14px] text-[--text-secondary] leading-relaxed mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl text-[14px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
