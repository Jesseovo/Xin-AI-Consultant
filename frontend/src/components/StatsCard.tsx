"use client";

export interface StatsCardProps {
  value: number | string;
  label: string;
}

export default function StatsCard({ value, label }: StatsCardProps) {
  return (
    <div className="sf-card group relative overflow-hidden px-5 pt-6 pb-5">
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px] opacity-[0.95]"
        style={{
          background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-secondary) 100%)",
          boxShadow: "0 2px 12px rgba(201, 100, 66, 0.22)",
        }}
      />
      <p className="text-[30px] sm:text-[34px] font-semibold tracking-tight text-[--accent] tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[12px] sm:text-[13px] text-[--text-muted] mt-2.5 font-medium">{label}</p>
    </div>
  );
}
