"use client";

import Link from "next/link";

export default function QuizPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="sf-card rounded-2xl p-8 sm:p-10 text-center border border-[--border-subtle]">
        <span className="inline-flex items-center rounded-full border border-[--accent]/30 bg-[--accent]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[--accent]">
          Coming soon
        </span>
        <div className="w-full h-40 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 mb-6 mx-auto max-w-sm mt-6" />
        <h1 className="text-[22px] font-semibold text-[--text-primary]">测验</h1>
        <p className="text-[14px] text-[--text-secondary] mt-3 leading-relaxed max-w-md mx-auto">
          自适应练习、知识点测验与错题回顾正在开发中。请先使用对话与深度解题巩固学习。
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
