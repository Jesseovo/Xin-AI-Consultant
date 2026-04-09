"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface DashboardStats {
  total_bots?: number;
  total_knowledge_bases?: number;
  total_student_interactions?: number;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", text: "知识库「程序设计」新增 3 个文档", time: "今天 10:20" },
  { id: "2", text: "机器人「高数助教」被使用 42 次", time: "昨天" },
];

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({});
  const [activity, setActivity] = useState<ActivityItem[]>(MOCK_ACTIVITY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<{ stats?: DashboardStats; activity?: ActivityItem[] }>("/teacher/dashboard");
        if (!cancelled && res.stats) setStats(res.stats);
        if (!cancelled && res.activity?.length) setActivity(res.activity);
      } catch {
        if (!cancelled) {
          setStats({ total_bots: 3, total_knowledge_bases: 2, total_student_interactions: 156 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { label: "机器人总数", value: stats.total_bots ?? "—" },
    { label: "知识库", value: stats.total_knowledge_bases ?? "—" },
    { label: "学生互动", value: stats.total_student_interactions ?? "—" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="rounded-2xl overflow-hidden mb-8">
        <img src="/images/teacher/dashboard-header.png" alt="" className="w-full h-36 object-cover" />
      </div>
      <h1 className="text-[22px] font-semibold text-[--text-primary]">工作台</h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-8">总览您的教学内容与使用数据</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="sf-card rounded-2xl p-5">
            <p className="text-[12px] text-[--text-muted] uppercase tracking-wide">{c.label}</p>
            <p className="text-[28px] font-semibold text-[--text-primary] mt-1">{loading ? "…" : c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <Link href="/teacher/bots" className="sf-card rounded-2xl overflow-hidden block no-underline hover:scale-[1.02]">
          <img src="/images/teacher/create-bot-guide.png" alt="" className="w-full h-28 object-cover" />
          <div className="p-4 text-center">
            <p className="text-[15px] font-medium text-[--accent]">创建机器人</p>
            <p className="text-[12px] text-[--text-muted] mt-1">配置导师人格与知识范围</p>
          </div>
        </Link>
        <Link href="/teacher/knowledge" className="sf-card rounded-2xl overflow-hidden block no-underline hover:scale-[1.02]">
          <img src="/images/teacher/upload-guide.png" alt="" className="w-full h-28 object-cover" />
          <div className="p-4 text-center">
            <p className="text-[15px] font-medium text-[--accent]">上传知识</p>
            <p className="text-[12px] text-[--text-muted] mt-1">文档解析与向量化</p>
          </div>
        </Link>
      </div>

      <div className="sf-glass rounded-2xl p-6">
        <h2 className="text-[15px] font-semibold text-[--text-primary] mb-4">最近动态</h2>
        <ul className="space-y-3">
          {activity.map((a) => (
            <li key={a.id} className="flex justify-between gap-4 text-[13px] border-b border-[--border-subtle] pb-3 last:border-0 last:pb-0">
              <span className="text-[--text-primary]">{a.text}</span>
              <span className="text-[--text-muted] shrink-0">{a.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
