"use client";

import Link from "next/link";

export default function NotebookPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="sf-card rounded-2xl p-8 sm:p-10 text-center border border-[--border-subtle]">
        <span className="inline-flex items-center rounded-full border border-[--accent]/30 bg-[--accent]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[--accent]">
          Coming soon
        </span>
        <img src="/images/modes/notebook.png" alt="笔记本" className="w-full h-40 rounded-xl object-contain mb-6 mx-auto max-w-sm mt-6" />
        <h1 className="text-[22px] font-semibold text-[--text-primary]">笔记本</h1>
        <p className="text-[14px] text-[--text-secondary] mt-3 leading-relaxed max-w-md mx-auto">
          笔记整理、知识卡片与复习清单即将上线。当前可在对话中随时提问并保存要点。
        </p>
        <Link
          href="/chat"
          className="inline-flex mt-8 px-5 py-2.5 rounded-xl bg-[--accent] text-white text-[14px] font-medium no-underline"
        >
          前往对话
        </Link>
      </div>
    </div>
  );
}
