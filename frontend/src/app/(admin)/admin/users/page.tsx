"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type UserRole = "admin" | "teacher" | "student";
type UserStatus = "active" | "disabled";

interface AdminUser {
  username: string;
  display_name: string;
  role: UserRole;
  department: string;
  created_at: string;
  status: UserStatus;
}

const INITIAL_USERS: AdminUser[] = [
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

function coerceRole(v: unknown): UserRole {
  if (v === "admin" || v === "teacher" || v === "student") return v;
  return "student";
}

function coerceStatus(v: unknown): UserStatus {
  if (v === "disabled" || v === "inactive") return "disabled";
  return "active";
}

function normalizeUser(raw: Record<string, unknown>): AdminUser | null {
  const username = String(raw.username ?? raw.user_name ?? "").trim();
  if (!username) return null;
  return {
    username,
    display_name: String(raw.display_name ?? raw.name ?? raw.displayName ?? username),
    role: coerceRole(raw.role),
    department: String(raw.department ?? raw.dept ?? ""),
    created_at: String(raw.created_at ?? raw.createdAt ?? "").slice(0, 10),
    status: coerceStatus(raw.status),
  };
}

function parseUsersResponse(data: unknown): AdminUser[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.users)) list = o.users;
    else if (Array.isArray(o.data)) list = o.data;
    else if (Array.isArray(o.items)) list = o.items;
  }
  const out: AdminUser[] = [];
  for (const item of list) {
    if (item && typeof item === "object") {
      const u = normalizeUser(item as Record<string, unknown>);
      if (u) out.push(u);
    }
  }
  return out;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("student");
  const [editDepartment, setEditDepartment] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addRole, setAddRole] = useState<UserRole>("student");
  const [addDepartment, setAddDepartment] = useState("");

  const [confirmAction, setConfirmAction] = useState<
    { type: "reset" | "delete"; username: string } | null
  >(null);
  const [flash, setFlash] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<unknown>("/admin/users");
      setUsers(parseUsersResponse(data));
    } catch {
      setUsers(INITIAL_USERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(t);
  }, [flash]);

  const stats = useMemo(() => {
    let admin = 0;
    let teacher = 0;
    let student = 0;
    for (const u of users) {
      if (u.role === "admin") admin++;
      else if (u.role === "teacher") teacher++;
      else student++;
    }
    return { total: users.length, admin, teacher, student };
  }, [users]);

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

  const openEdit = (u: AdminUser) => {
    setEditingUsername(u.username);
    setEditDisplayName(u.display_name);
    setEditRole(u.role);
    setEditDepartment(u.department);
  };

  const closeEdit = () => {
    setEditingUsername(null);
  };

  const saveEdit = () => {
    if (!editingUsername) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.username === editingUsername
          ? {
              ...u,
              display_name: editDisplayName.trim() || u.display_name,
              role: editRole,
              department: editDepartment.trim(),
            }
          : u
      )
    );
    closeEdit();
  };

  const openAdd = () => {
    setAddUsername("");
    setAddDisplayName("");
    setAddRole("student");
    setAddDepartment("");
    setAddOpen(true);
  };

  const closeAdd = () => setAddOpen(false);

  const saveAdd = () => {
    const un = addUsername.trim();
    if (!un) return;
    if (users.some((u) => u.username === un)) return;
    const today = new Date().toISOString().slice(0, 10);
    setUsers((prev) => [
      ...prev,
      {
        username: un,
        display_name: addDisplayName.trim() || un,
        role: addRole,
        department: addDepartment.trim(),
        created_at: today,
        status: "active",
      },
    ]);
    closeAdd();
  };

  const runConfirm = () => {
    if (!confirmAction) return;
    const { type, username } = confirmAction;
    setConfirmAction(null);
    if (type === "reset") {
      setFlash("已重置");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.username !== username));
    if (editingUsername === username) closeEdit();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      {flash && (
        <div
          className="fixed top-6 left-1/2 z-[120] -translate-x-1/2 sf-glass rounded-[14px] px-4 py-2.5 text-[13px] text-[--text-primary] shadow-lg pointer-events-none"
          role="status"
        >
          {flash}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">
            用户管理
          </h1>
          <p className="text-[13px] text-[--text-secondary] mt-0.5">
            搜索与筛选用户，编辑资料、重置密码或调整账号状态；列表可与后端同步，离线时显示本地示例。
          </p>
        </div>
        <button
          type="button"
          className="sf-btn-primary shrink-0 px-4 py-2.5 rounded-[14px] text-[13px] font-medium"
          onClick={openAdd}
        >
          添加用户
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="sf-card rounded-[20px] p-4 hover:!translate-y-0">
          <p className="text-[12px] text-[--text-muted] mb-1">全部</p>
          <p className="text-[22px] font-semibold text-[--text-primary] tabular-nums">
            {stats.total}
          </p>
        </div>
        <div className="sf-card rounded-[20px] p-4 hover:!translate-y-0">
          <p className="text-[12px] text-[--text-muted] mb-1">管理员</p>
          <p className="text-[22px] font-semibold text-[--text-primary] tabular-nums">
            {stats.admin}
          </p>
        </div>
        <div className="sf-card rounded-[20px] p-4 hover:!translate-y-0">
          <p className="text-[12px] text-[--text-muted] mb-1">教师</p>
          <p className="text-[22px] font-semibold text-[--text-primary] tabular-nums">
            {stats.teacher}
          </p>
        </div>
        <div className="sf-card rounded-[20px] p-4 hover:!translate-y-0">
          <p className="text-[12px] text-[--text-muted] mb-1">学生</p>
          <p className="text-[22px] font-semibold text-[--text-primary] tabular-nums">
            {stats.student}
          </p>
        </div>
      </div>

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
        {loading && (
          <p className="text-[13px] text-[--text-muted] mb-4">加载中…</p>
        )}
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
                          u.status === "active"
                            ? "sf-dot sf-dot-success"
                            : "sf-dot sf-dot-error"
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
                        onClick={() => openEdit(u)}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="sf-btn-secondary px-2.5 py-1.5 rounded-[12px] text-[12px]"
                        onClick={() =>
                          setConfirmAction({ type: "reset", username: u.username })
                        }
                      >
                        重置密码
                      </button>
                      <button
                        type="button"
                        className="sf-btn-danger px-2.5 py-1.5 text-[12px] rounded-[12px]"
                        onClick={() =>
                          setConfirmAction({ type: "delete", username: u.username })
                        }
                      >
                        删除
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
                          u.status === "active"
                            ? "sf-dot sf-dot-success"
                            : "sf-dot sf-dot-error"
                        }
                      />
                      {u.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="sf-btn-ghost px-2.5 py-1.5 rounded-[12px] text-[12px]"
                      onClick={() => openEdit(u)}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="sf-btn-secondary px-2.5 py-1.5 rounded-[12px] text-[12px]"
                      onClick={() =>
                        setConfirmAction({ type: "reset", username: u.username })
                      }
                    >
                      重置密码
                    </button>
                    <button
                      type="button"
                      className="sf-btn-danger px-2.5 py-1.5 text-[12px] rounded-[12px]"
                      onClick={() =>
                        setConfirmAction({ type: "delete", username: u.username })
                      }
                    >
                      删除
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

        {!loading && filtered.length === 0 && (
          <p className="text-[13px] text-[--text-muted] text-center py-8">
            没有匹配的用户
          </p>
        )}
      </div>

      {editingUsername && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sf-glass bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="sf-card rounded-[20px] p-6 w-full max-w-md hover:!translate-y-0 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="edit-user-title"
              className="text-[22px] font-semibold text-[--text-primary] tracking-tight mb-4"
            >
              编辑用户
            </h2>
            <p className="text-[13px] text-[--text-secondary] mb-4">
              {editingUsername}
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[12px] text-[--text-muted]">显示名</span>
                <input
                  className="sf-input mt-1 w-full px-3 py-2.5 text-[13px] text-[--text-primary]"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[12px] text-[--text-muted]">角色</span>
                <select
                  className="sf-input mt-1 w-full px-3 py-2.5 text-[13px] text-[--text-primary]"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                >
                  <option value="admin">管理员</option>
                  <option value="teacher">教师</option>
                  <option value="student">学生</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] text-[--text-muted]">院系</span>
                <input
                  className="sf-input mt-1 w-full px-3 py-2.5 text-[13px] text-[--text-primary]"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="sf-btn-ghost px-4 py-2.5 rounded-[14px] text-[13px]"
                onClick={closeEdit}
              >
                取消
              </button>
              <button
                type="button"
                className="sf-btn-primary px-4 py-2.5 rounded-[14px] text-[13px] font-medium"
                onClick={saveEdit}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sf-glass bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAdd();
          }}
        >
          <div
            className="sf-card rounded-[20px] p-6 w-full max-w-md hover:!translate-y-0 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="add-user-title"
              className="text-[22px] font-semibold text-[--text-primary] tracking-tight mb-4"
            >
              添加用户
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[12px] text-[--text-muted]">用户名</span>
                <input
                  className="sf-input mt-1 w-full px-3 py-2.5 text-[13px] text-[--text-primary]"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="block">
                <span className="text-[12px] text-[--text-muted]">显示名</span>
                <input
                  className="sf-input mt-1 w-full px-3 py-2.5 text-[13px] text-[--text-primary]"
                  value={addDisplayName}
                  onChange={(e) => setAddDisplayName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[12px] text-[--text-muted]">角色</span>
                <select
                  className="sf-input mt-1 w-full px-3 py-2.5 text-[13px] text-[--text-primary]"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as UserRole)}
                >
                  <option value="admin">管理员</option>
                  <option value="teacher">教师</option>
                  <option value="student">学生</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] text-[--text-muted]">院系</span>
                <input
                  className="sf-input mt-1 w-full px-3 py-2.5 text-[13px] text-[--text-primary]"
                  value={addDepartment}
                  onChange={(e) => setAddDepartment(e.target.value)}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="sf-btn-ghost px-4 py-2.5 rounded-[14px] text-[13px]"
                onClick={closeAdd}
              >
                取消
              </button>
              <button
                type="button"
                className="sf-btn-primary px-4 py-2.5 rounded-[14px] text-[13px] font-medium"
                onClick={saveAdd}
                disabled={!addUsername.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sf-glass bg-black/40"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmAction(null);
          }}
        >
          <div
            className="sf-card rounded-[20px] p-6 w-full max-w-sm hover:!translate-y-0 shadow-[0_24px_64px_-20px_rgba(0,0,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] text-[--text-primary] leading-relaxed">
              {confirmAction.type === "reset"
                ? `确定要重置用户「${confirmAction.username}」的密码吗？`
                : `确定要删除用户「${confirmAction.username}」吗？此操作不可撤销。`}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="sf-btn-ghost px-4 py-2.5 rounded-[14px] text-[13px]"
                onClick={() => setConfirmAction(null)}
              >
                取消
              </button>
              <button
                type="button"
                className={
                  confirmAction.type === "delete"
                    ? "sf-btn-danger px-4 py-2.5 rounded-[14px] text-[13px] font-medium"
                    : "sf-btn-primary px-4 py-2.5 rounded-[14px] text-[13px] font-medium"
                }
                onClick={runConfirm}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
