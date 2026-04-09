"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface NotebookSummary {
  id: number;
  name: string;
  description: string | null;
  color: string;
  record_count: number;
  created_at: string | null;
}

const PRESET_COLORS = [
  "#8B6F47", "#6ba89a", "#c4956a", "#a8d8ea",
  "#d4a574", "#7ec4b0", "#b8956a", "#5a8f7b",
];

const MOCK_NOTEBOOKS: NotebookSummary[] = [
  { id: -1, name: "数据结构笔记", description: "课堂笔记和知识整理", color: "#8B6F47", record_count: 12, created_at: "2026-04-01T10:00:00" },
  { id: -2, name: "算法学习心得", description: "刷题记录与解题思路", color: "#6ba89a", record_count: 8, created_at: "2026-03-25T14:30:00" },
  { id: -3, name: "操作系统复习", description: null, color: "#c4956a", record_count: 5, created_at: "2026-03-20T09:00:00" },
];

export default function NotebookPage() {
  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<NotebookSummary[]>("/notebook/");
      setNotebooks(Array.isArray(res) ? res : []);
      setIsDemo(false);
    } catch {
      setNotebooks(MOCK_NOTEBOOKS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await api.post("/notebook/", {
        name,
        description: newDesc.trim() || null,
        color: newColor,
      });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (id < 0) return;
    setDeleting(id);
    try {
      await api.del(`/notebook/${id}`);
      setNotebooks((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">笔记本</h1>
          <p className="text-[13px] text-[--text-secondary] mt-0.5">整理和管理你的学习笔记</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-[--accent] text-white text-[14px] font-medium transition-opacity hover:opacity-90"
        >
          + 新建
        </button>
      </div>

      {isDemo && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
          无法连接后端，当前为演示模式
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div className="sf-card rounded-2xl p-6 mb-6 border border-[--border-subtle]">
          <h2 className="text-[16px] font-semibold text-[--text-primary] mb-4">新建笔记本</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">名称</label>
              <input
                className="sf-input w-full px-4 py-3 text-[15px]"
                placeholder="例：数据结构笔记"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">描述（可选）</label>
              <input
                className="sf-input w-full px-4 py-2.5 text-[14px]"
                placeholder="笔记本简介…"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">颜色</label>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      newColor === c ? "border-[--text-primary] scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            {error && (
              <div className="text-[13px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
                className="px-5 py-2 rounded-xl bg-[--accent] text-white text-[14px] font-medium disabled:opacity-40"
              >
                {creating ? "创建中…" : "创建"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-5 py-2 rounded-xl border border-[--border-subtle] text-[14px] text-[--text-secondary]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notebook list */}
      {loading ? (
        <p className="text-[14px] text-[--text-muted]">加载中…</p>
      ) : notebooks.length === 0 ? (
        <div className="sf-card rounded-2xl p-8 text-center border border-[--border-subtle]">
          <img src="/images/modes/notebook.png" alt="" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <p className="text-[14px] text-[--text-secondary]">还没有笔记本，点击"新建"创建第一个</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((nb) => (
            <div key={nb.id} className="sf-card rounded-xl border border-[--border-subtle] hover:border-[--accent]/25 transition-colors overflow-hidden">
              <div className="h-2" style={{ backgroundColor: nb.color }} />
              <div className="p-4">
                <Link
                  href={nb.id > 0 ? `/notebook/${nb.id}` : "#"}
                  className="block no-underline"
                >
                  <h3 className="text-[15px] font-medium text-[--text-primary] truncate">{nb.name}</h3>
                  {nb.description && (
                    <p className="text-[12px] text-[--text-secondary] mt-1 line-clamp-2">{nb.description}</p>
                  )}
                  <p className="text-[12px] text-[--text-muted] mt-2">
                    {nb.record_count} 条记录
                    {nb.created_at && ` · ${new Date(nb.created_at).toLocaleDateString("zh-CN")}`}
                  </p>
                </Link>
                {nb.id > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(nb.id)}
                    disabled={deleting === nb.id}
                    className="mt-2 text-[12px] text-red-500 hover:text-red-600 transition-colors"
                  >
                    {deleting === nb.id ? "删除中…" : "删除"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
