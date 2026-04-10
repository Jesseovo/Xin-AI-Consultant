"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Student = {
  id: string;
  name: string;
  department: string;
  avatar_color: string;
  active_days: number;
  total_chats: number;
  quiz_avg_score: number;
  last_active: string;
};

type SortKey = "name" | "score" | "activity";

const MOCK_STUDENTS: Student[] = [
  {
    id: "stu-001",
    name: "陈思远",
    department: "计算机科学与技术",
    avatar_color: "#5B8DEF",
    active_days: 28,
    total_chats: 142,
    quiz_avg_score: 88,
    last_active: "2026-04-09",
  },
  {
    id: "stu-002",
    name: "李雨桐",
    department: "软件工程",
    avatar_color: "#C96442",
    active_days: 24,
    total_chats: 98,
    quiz_avg_score: 92,
    last_active: "2026-04-08",
  },
  {
    id: "stu-003",
    name: "王浩然",
    department: "人工智能",
    avatar_color: "#2D9D78",
    active_days: 31,
    total_chats: 201,
    quiz_avg_score: 79,
    last_active: "2026-04-10",
  },
  {
    id: "stu-004",
    name: "刘梓涵",
    department: "数据科学与大数据技术",
    avatar_color: "#8B5CF6",
    active_days: 19,
    total_chats: 67,
    quiz_avg_score: 85,
    last_active: "2026-04-07",
  },
  {
    id: "stu-005",
    name: "赵子墨",
    department: "网络工程",
    avatar_color: "#E11D48",
    active_days: 12,
    total_chats: 44,
    quiz_avg_score: 71,
    last_active: "2026-04-05",
  },
  {
    id: "stu-006",
    name: "周若曦",
    department: "信息安全",
    avatar_color: "#0EA5E9",
    active_days: 26,
    total_chats: 156,
    quiz_avg_score: 90,
    last_active: "2026-04-09",
  },
  {
    id: "stu-007",
    name: "吴俊宇",
    department: "物联网工程",
    avatar_color: "#D97706",
    active_days: 8,
    total_chats: 23,
    quiz_avg_score: 64,
    last_active: "2026-04-03",
  },
  {
    id: "stu-008",
    name: "孙佳怡",
    department: "计算机科学与技术",
    avatar_color: "#14B8A6",
    active_days: 22,
    total_chats: 118,
    quiz_avg_score: 87,
    last_active: "2026-04-08",
  },
  {
    id: "stu-009",
    name: "郑博文",
    department: "软件工程",
    avatar_color: "#6366F1",
    active_days: 15,
    total_chats: 52,
    quiz_avg_score: 76,
    last_active: "2026-04-06",
  },
];

function normalizeStudent(raw: Record<string, unknown>): Student | null {
  const id = raw.id ?? raw.student_id;
  const name = raw.name;
  if (typeof id !== "string" || typeof name !== "string") return null;
  const dept =
    (typeof raw.department === "string" && raw.department) ||
    (typeof raw.major === "string" && raw.major) ||
    "—";
  const color =
    typeof raw.avatar_color === "string" && raw.avatar_color ? raw.avatar_color : "#5B8DEF";
  const active =
    typeof raw.active_days === "number"
      ? raw.active_days
      : Number(raw.active_days) || 0;
  const chats =
    typeof raw.total_chats === "number"
      ? raw.total_chats
      : Number(raw.total_chats) || 0;
  const scoreRaw = raw.quiz_avg_score ?? raw.avg_score;
  const score =
    typeof scoreRaw === "number"
      ? Math.min(100, Math.max(0, scoreRaw))
      : Math.min(100, Math.max(0, Number(scoreRaw) || 0));
  const last =
    typeof raw.last_active === "string"
      ? raw.last_active
      : raw.last_active instanceof Date
        ? raw.last_active.toISOString().slice(0, 10)
        : String(raw.last_active ?? "");
  return {
    id,
    name,
    department: dept,
    avatar_color: color,
    active_days: active,
    total_chats: chats,
    quiz_avg_score: score,
    last_active: last || "—",
  };
}

function parseStudentsPayload(data: unknown): Student[] {
  if (!data || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (Array.isArray(o.students)) list = o.students;
  else if (Array.isArray(o.data)) list = o.data;
  else if (Array.isArray(o.items)) list = o.items;
  const out: Student[] = [];
  for (const item of list) {
    if (item && typeof item === "object") {
      const s = normalizeStudent(item as Record<string, unknown>);
      if (s) out.push(s);
    }
  }
  return out;
}

function initials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  if (/[\u3000-\u9fff\uf900-\ufadf]/.test(t)) {
    return t.length >= 2 ? t.slice(0, 2) : t;
  }
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<unknown>("/teacher/students");
        const parsed = parseStudentsPayload(res);
        if (!cancelled) setStudents(parsed);
      } catch {
        if (!cancelled) setStudents(MOCK_STUDENTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    } else if (sortBy === "score") {
      copy.sort((a, b) => b.quiz_avg_score - a.quiz_avg_score);
    } else {
      copy.sort((a, b) => {
        const ta = Date.parse(b.last_active) || 0;
        const tb = Date.parse(a.last_active) || 0;
        return ta - tb;
      });
    }
    return copy;
  }, [filtered, sortBy]);

  const stats = useMemo(() => {
    if (!students.length) {
      return { total: 0, avgScore: 0, totalChats: 0 };
    }
    const total = students.length;
    const sumScore = students.reduce((acc, s) => acc + s.quiz_avg_score, 0);
    const totalChats = students.reduce((acc, s) => acc + s.total_chats, 0);
    return {
      total,
      avgScore: Math.round((sumScore / total) * 10) / 10,
      totalChats,
    };
  }, [students]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="rounded-[20px] overflow-hidden mb-8 shadow-[0_2px_16px_rgba(90,62,34,.10)]">
        <img
          src="/images/student/progress-header.png"
          alt=""
          className="w-full h-auto object-cover"
        />
      </div>
      <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">学生数据</h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-8 leading-relaxed">
        学习行为与互动统计，支持检索与排序
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {loading ? (
          <>
            <div className="sf-card rounded-[20px] p-6 sm:p-7">
              <div className="sf-skeleton rounded-[12px] h-3 w-20 mb-3" />
              <div className="sf-skeleton rounded-[12px] h-9 w-16" />
            </div>
            <div className="sf-card rounded-[20px] p-6 sm:p-7">
              <div className="sf-skeleton rounded-[12px] h-3 w-20 mb-3" />
              <div className="sf-skeleton rounded-[12px] h-9 w-16" />
            </div>
            <div className="sf-card rounded-[20px] p-6 sm:p-7">
              <div className="sf-skeleton rounded-[12px] h-3 w-20 mb-3" />
              <div className="sf-skeleton rounded-[12px] h-9 w-16" />
            </div>
          </>
        ) : (
          <>
            <div className="sf-card rounded-[20px] p-6 sm:p-7 border border-[--border-subtle] bg-[--bg-card]">
              <p className="text-[13px] text-[--text-muted] tracking-tight mb-1">学生总数</p>
              <p className="text-[22px] font-semibold text-[--text-primary] tracking-tight tabular-nums">
                {stats.total}
              </p>
            </div>
            <div className="sf-card rounded-[20px] p-6 sm:p-7 border border-[--border-subtle] bg-[--bg-card]">
              <p className="text-[13px] text-[--text-muted] tracking-tight mb-1">测验平均分</p>
              <p className="text-[22px] font-semibold text-[--text-primary] tracking-tight tabular-nums">
                {stats.total ? stats.avgScore : "—"}
              </p>
            </div>
            <div className="sf-card rounded-[20px] p-6 sm:p-7 border border-[--border-subtle] bg-[--bg-card]">
              <p className="text-[13px] text-[--text-muted] tracking-tight mb-1">对话总次数</p>
              <p className="text-[22px] font-semibold text-[--text-primary] tracking-tight tabular-nums">
                {stats.totalChats}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索学生姓名"
          className="sf-input flex-1 min-w-0 px-4 py-3 text-[13px] placeholder:text-[--text-muted] rounded-[20px]"
          aria-label="搜索学生"
        />
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[13px] text-[--text-muted] mr-1">排序</span>
          <button
            type="button"
            onClick={() => setSortBy("name")}
            className={
              sortBy === "name"
                ? "sf-btn-primary px-4 py-2.5 text-[13px] rounded-[20px]"
                : "sf-btn-ghost px-4 py-2.5 text-[13px] rounded-[20px]"
            }
          >
            姓名
          </button>
          <button
            type="button"
            onClick={() => setSortBy("score")}
            className={
              sortBy === "score"
                ? "sf-btn-primary px-4 py-2.5 text-[13px] rounded-[20px]"
                : "sf-btn-ghost px-4 py-2.5 text-[13px] rounded-[20px]"
            }
          >
            成绩
          </button>
          <button
            type="button"
            onClick={() => setSortBy("activity")}
            className={
              sortBy === "activity"
                ? "sf-btn-primary px-4 py-2.5 text-[13px] rounded-[20px]"
                : "sf-btn-ghost px-4 py-2.5 text-[13px] rounded-[20px]"
            }
          >
            活跃度
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sf-card rounded-[20px] p-6 sm:p-7">
              <div className="flex gap-4 mb-4">
                <div className="sf-skeleton rounded-full h-14 w-14 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="sf-skeleton rounded-[12px] h-4 w-3/5 max-w-[140px]" />
                  <div className="sf-skeleton rounded-[12px] h-3 w-4/5 max-w-[180px]" />
                </div>
              </div>
              <div className="sf-skeleton rounded-[12px] h-10 w-full mb-3" />
              <div className="sf-skeleton rounded-[12px] h-9 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((s) => (
            <article
              key={s.id}
              className="sf-card rounded-[20px] p-6 sm:p-7 border border-[--border-subtle] bg-[--bg-card] flex flex-col gap-5 transition-shadow duration-300 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)]"
            >
              <div className="flex gap-4 items-start">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center text-[15px] font-semibold text-white shrink-0 tracking-tight shadow-inner"
                  style={{ backgroundColor: s.avatar_color }}
                >
                  {initials(s.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-[--text-primary] tracking-tight truncate">
                    {s.name}
                  </h2>
                  <p className="text-[13px] text-[--text-secondary] mt-1 leading-relaxed line-clamp-2">
                    {s.department}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="sf-badge text-[12px] tabular-nums">
                  活跃 {s.active_days} 天
                </span>
                <span className="sf-badge text-[12px] tabular-nums">对话 {s.total_chats}</span>
                <span className="sf-badge text-[12px] tabular-nums text-[--accent]">
                  均分 {s.quiz_avg_score}
                </span>
              </div>
              <div className="mt-auto pt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-[--text-muted] tracking-tight">
                  最近活跃 · {s.last_active}
                </p>
                <button
                  type="button"
                  className="sf-btn-secondary px-4 py-2.5 text-[13px] rounded-[20px] shrink-0 w-full sm:w-auto"
                >
                  查看详情
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="sf-card rounded-[20px] p-10 text-center mt-4">
          <p className="text-[13px] text-[--text-secondary]">未找到匹配的学生</p>
        </div>
      )}
    </div>
  );
}
