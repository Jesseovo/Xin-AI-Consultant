"use client";

export interface StatsCardProps {
  value: number | string;
  label: string;
}

export default function StatsCard({ value, label }: StatsCardProps) {
  return (
    <div className="sf-card relative overflow-hidden p-5 rounded-2xl">
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{
          background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-secondary) 100%)",
        }}
      />
      <p className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[--text-primary] tabular-nums pt-1">
        {value}
      </p>
      <p className="text-[13px] text-[--text-secondary] mt-1">{label}</p>
    </div>
  );
}
