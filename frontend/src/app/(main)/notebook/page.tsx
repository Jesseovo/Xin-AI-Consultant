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

/** Screen-reader labels for preset swatches (hex is not meaningful to AT). */
const PRESET_COLOR_ARIA_LABEL: Record<string, string> = {
  "#8B6F47": "棕色",
  "#6ba89a": "青色",
  "#c4956a": "橙色",
  "#a8d8ea": "蓝色",
  "#d4a574": "橙色",
  "#7ec4b0": "青色",
  "#b8956a": "棕色",
  "#5a8f7b": "绿色",
};

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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">笔记本</h1>
          <p className="text-[13px] text-[--text-secondary] mt-1">整理和管理你的学习笔记</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="sf-btn-primary rounded-full px-5 py-2.5 text-[14px] shrink-0"
        >
          + 新建
        </button>
      </div>

      {isDemo && (
        <div
          className="mb-6 rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 px-4 py-2.5 text-sm text-[#6b5a3a] dark:text-amber-100/90 shadow-[0_0_0_1px_rgba(217,180,100,0.35)]"
          role="status"
        >
          无法连接后端，当前为演示模式
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div className="sf-card rounded-2xl p-6 mb-8">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[--text-muted] mb-2">新建</p>
          <h2 className="text-[16px] font-semibold text-[--text-primary] tracking-tight mb-5">笔记本</h2>
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
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-9 h-9 rounded-full transition-transform shadow-[0_0_0_1px_rgba(208,205,195,0.35)] ${
                      newColor === c ? "scale-110 shadow-[0_0_0_3px_var(--text-primary)]" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={PRESET_COLOR_ARIA_LABEL[c] ?? c}
                  />
                ))}
              </div>
            </div>
            {error && (
              <div className="rounded-2xl px-3 py-2.5 text-[13px] bg-[#c45c5c]/10 text-[#8b4a4a] dark:text-[#e8a8a8] shadow-[0_0_0_1px_rgba(196,92,92,0.2)]">
                {error}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating || !newName.trim()}
                className="sf-btn-primary rounded-full px-5 py-2 text-[14px] disabled:opacity-40 disabled:pointer-events-none"
              >
                {creating ? "创建中…" : "创建"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="sf-btn-secondary rounded-full px-5 py-2 text-[14px]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notebook list */}
      <p className="text-[13px] uppercase tracking-[0.2em] text-[--text-muted] mb-2">笔记库</p>
      <h2 className="text-[16px] font-semibold text-[--text-primary] tracking-tight mb-4">全部笔记本</h2>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sf-card rounded-2xl overflow-hidden">
              <div className="h-2.5 sf-skeleton rounded-none" />
              <div className="p-4 space-y-2">
                <div className="sf-skeleton h-4 w-3/4" />
                <div className="sf-skeleton h-3 w-full" />
                <div className="sf-skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notebooks.length === 0 ? (
        <div className="sf-card rounded-2xl p-10 text-center">
          <img src="/images/modes/notebook.png" alt="" className="w-28 h-28 mx-auto mb-5 object-contain opacity-95" />
          <p className="text-[15px] text-[--text-secondary] leading-relaxed max-w-sm mx-auto">
            还没有笔记本，点击「新建」创建第一个
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((nb) => (
            <div key={nb.id} className="sf-card rounded-2xl overflow-hidden group">
              <div className="h-2.5" style={{ backgroundColor: nb.color }} />
              <div className="p-4">
                <Link
                  href={nb.id > 0 ? `/notebook/${nb.id}` : "#"}
                  className="block no-underline"
                >
                  <h3 className="text-[15px] font-semibold text-[--text-primary] truncate">{nb.name}</h3>
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
                    className="sf-btn-danger mt-3 rounded-full text-[11px] py-1.5 px-3 disabled:opacity-50"
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
