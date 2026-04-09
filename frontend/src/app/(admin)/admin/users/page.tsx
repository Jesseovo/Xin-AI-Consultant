"use client";

import { useMemo, useState } from "react";

type UserRole = "admin" | "teacher" | "student";
type UserStatus = "active" | "disabled";

interface MockUser {
  username: string;
  display_name: string;
  role: UserRole;
  department: string;
  created_at: string;
  status: UserStatus;
}

const INITIAL_USERS: MockUser[] = [
  {
    username: "admin",
    display_name: "系统管理员",
    role: "admin",
    department: "信息中心",
    created_at: "2024-09-01",
    status: "active",
  },
  {
    username: "teacher_wang",
    display_name: "王教授",
    role: "teacher",
    department: "计算机学院",
    created_at: "2024-09-15",
    status: "active",
  },
  {
    username: "teacher_li",
    display_name: "李老师",
    role: "teacher",
    department: "数学学院",
    created_at: "2024-10-01",
    status: "active",
  },
  {
    username: "student_zhang",
    display_name: "张同学",
    role: "student",
    department: "软件工程",
    created_at: "2024-10-10",
    status: "active",
  },
  {
    username: "student_liu",
    display_name: "刘同学",
    role: "student",
    department: "人工智能",
    created_at: "2024-11-01",
    status: "disabled",
  },
];

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理员",
  teacher: "教师",
  student: "学生",
};

type RoleFilter = "all" | UserRole;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<MockUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.username.toLowerCase().includes(q) ||
        u.display_name.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      );
    });
  }, [users, search, roleFilter]);

  const toggleStatus = (username: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.username === username
          ? { ...u, status: u.status === "active" ? "disabled" : "active" }
          : u
      )
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">
        用户管理
      </h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-8">
        搜索、筛选角色并管理账号状态（演示数据）
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="搜索用户名、姓名或院系…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sf-input flex-1 min-w-0 px-3 py-2.5 text-[13px] placeholder:text-[--text-muted]"
          aria-label="搜索用户"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="sf-input shrink-0 px-3 py-2.5 text-[13px] text-[--text-primary] sm:w-[160px]"
          aria-label="按角色筛选"
        >
          <option value="all">全部角色</option>
          <option value="admin">管理员</option>
          <option value="teacher">教师</option>
          <option value="student">学生</option>
        </select>
      </div>

      <div className="sf-card rounded-[20px] p-4 sm:p-6">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="text-[12px] text-[--text-muted] uppercase tracking-wide">
                <th className="pb-3 pr-3 font-medium">用户</th>
                <th className="pb-3 pr-3 font-medium">显示名</th>
                <th className="pb-3 pr-3 font-medium">角色</th>
                <th className="pb-3 pr-3 font-medium">院系</th>
                <th className="pb-3 pr-3 font-medium">创建日期</th>
                <th className="pb-3 pr-3 font-medium">状态</th>
                <th className="pb-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.username}
                  className="shadow-[inset_0_-1px_0_0_var(--border-subtle)] last:shadow-none"
                >
                  <td className="py-3 pr-3 align-middle">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 shrink-0 rounded-full bg-[--accent]/10 shadow-[0_0_0_1px_var(--accent-glow)]"
                        aria-hidden
                      />
                      <span className="text-[--text-primary] font-medium">
                        {u.username}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 align-middle text-[--text-secondary]">
                    {u.display_name}
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <span className="sf-badge">{ROLE_LABEL[u.role]}</span>
                  </td>
                  <td className="py-3 pr-3 align-middle text-[--text-secondary]">
                    {u.department}
                  </td>
                  <td className="py-3 pr-3 align-middle text-[--text-muted] tabular-nums">
                    {u.created_at}
                  </td>
                  <td className="py-3 pr-3 align-middle">
                    <span className="inline-flex items-center gap-2 text-[--text-secondary]">
                      <span
                        className={
                          u.status === "active" ? "sf-dot sf-dot-success" : "sf-dot sf-dot-error"
                        }
                        title={u.status === "active" ? "正常" : "已禁用"}
                      />
                      {u.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </td>
                  <td className="py-3 align-middle text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="sf-btn-ghost px-2.5 py-1.5 rounded-[12px] text-[12px]"
                        onClick={() => {}}
                      >
                        编辑
                      </button>
                      {u.status === "active" ? (
                        <button
                          type="button"
                          className="sf-btn-danger px-2.5 py-1.5 text-[12px] rounded-[12px]"
                          onClick={() => toggleStatus(u.username)}
                        >
                          禁用
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sf-btn-ghost px-2.5 py-1.5 rounded-[12px] text-[12px] text-[--accent]"
                          onClick={() => toggleStatus(u.username)}
                        >
                          启用
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="md:hidden space-y-3">
          {filtered.map((u) => (
            <li
              key={u.username}
              className="rounded-[16px] p-4 shadow-[0_0_0_1px_var(--chip-border)] bg-[--bg-card]/80"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 shrink-0 rounded-full bg-[--accent]/10 shadow-[0_0_0_1px_var(--accent-glow)]"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[--text-primary] font-semibold text-[14px]">
                      {u.username}
                    </span>
                    <span className="sf-badge">{ROLE_LABEL[u.role]}</span>
                  </div>
                  <p className="text-[13px] text-[--text-secondary] mt-0.5">
                    {u.display_name}
                  </p>
                  <p className="text-[12px] text-[--text-muted] mt-1">{u.department}</p>
                  <div className="flex items-center gap-2 mt-2 text-[12px] text-[--text-muted]">
                    <span className="tabular-nums">{u.created_at}</span>
                    <span className="inline-flex items-center gap-1.5 text-[--text-secondary]">
                      <span
                        className={
                          u.status === "active" ? "sf-dot sf-dot-success" : "sf-dot sf-dot-error"
                        }
                      />
                      {u.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="sf-btn-ghost px-2.5 py-1.5 rounded-[12px] text-[12px]"
                      onClick={() => {}}
                    >
                      编辑
                    </button>
                    {u.status === "active" ? (
                      <button
                        type="button"
                        className="sf-btn-danger px-2.5 py-1.5 text-[12px] rounded-[12px]"
                        onClick={() => toggleStatus(u.username)}
                      >
                        禁用
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sf-btn-ghost px-2.5 py-1.5 rounded-[12px] text-[12px] text-[--accent]"
                        onClick={() => toggleStatus(u.username)}
                      >
                        启用
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <p className="text-[13px] text-[--text-muted] text-center py-8">
            没有匹配的用户
          </p>
        )}
      </div>
    </div>
  );
}
