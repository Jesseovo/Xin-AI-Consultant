"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface NotebookRecord {
  id: number;
  notebook_id: number;
  title: string | null;
  content: string;
  source_type: string | null;
  source_id: number | null;
  tags: string[] | null;
  created_at: string | null;
}

const MOCK_RECORDS: NotebookRecord[] = [
  { id: -1, notebook_id: -1, title: "二叉树的遍历", content: "前序遍历：根 → 左 → 右\n中序遍历：左 → 根 → 右\n后序遍历：左 → 右 → 根", source_type: null, source_id: null, tags: ["树", "遍历"], created_at: "2026-04-01T10:00:00" },
  { id: -2, notebook_id: -1, title: "图的存储方式", content: "1. 邻接矩阵：适合稠密图\n2. 邻接表：适合稀疏图\n3. 十字链表：有向图的优化存储", source_type: null, source_id: null, tags: ["图"], created_at: "2026-03-28T14:30:00" },
  { id: -3, notebook_id: -1, title: null, content: "快速排序的平均时间复杂度为 O(n log n)，最坏情况为 O(n²)。", source_type: null, source_id: null, tags: null, created_at: "2026-03-25T09:00:00" },
];

export default function NotebookDetailPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const router = useRouter();

  const [records, setRecords] = useState<NotebookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ records: NotebookRecord[] }>(`/notebook/${notebookId}/records`);
      setRecords(res.records || []);
      setIsDemo(false);
    } catch {
      setRecords(MOCK_RECORDS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [notebookId]);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    const content = newContent.trim();
    if (!content) return;
    setAdding(true);
    setError(null);
    try {
      const tagList = newTags.trim()
        ? newTags.split(/[,，\s]+/).filter(Boolean)
        : null;
      await api.post(`/notebook/${notebookId}/records`, {
        title: newTitle.trim() || null,
        content,
        tags: tagList,
      });
      setNewTitle("");
      setNewContent("");
      setNewTags("");
      setShowAdd(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (recordId < 0) return;
    setDeleting(recordId);
    try {
      await api.del(`/notebook/${notebookId}/records/${recordId}`);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button type="button" onClick={() => router.push("/notebook")} className="sf-btn-ghost text-[13px] text-[--accent] mb-3 -ml-1 px-2 py-1 rounded-full">
          ← 返回笔记本列表
        </button>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-semibold text-[--text-primary] tracking-tight">笔记记录</h1>
            <p className="text-[13px] text-[--text-secondary] mt-1 hidden sm:block">浏览与管理单条笔记</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="sf-btn-primary rounded-full px-4 py-2 text-[13px] shrink-0"
          >
            + 添加记录
          </button>
        </div>
      </div>

      {isDemo && (
        <div
          className="mb-6 rounded-2xl bg-amber-50/90 dark:bg-amber-950/35 px-4 py-2.5 text-sm text-[#6b5a3a] dark:text-amber-100/90 shadow-[0_0_0_1px_rgba(217,180,100,0.35)]"
          role="status"
        >
          演示模式 — 后端不可用
        </div>
      )}

      {/* Add record form */}
      {showAdd && (
        <div className="sf-card rounded-2xl p-6 mb-8">
          <p className="text-[13px] uppercase tracking-[0.2em] text-[--text-muted] mb-2">新建</p>
          <h2 className="text-[16px] font-semibold text-[--text-primary] tracking-tight mb-5">笔记条目</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">标题（可选）</label>
              <input
                className="sf-input w-full px-4 py-2.5 text-[14px]"
                placeholder="笔记标题…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">内容</label>
              <textarea
                className="sf-input w-full px-4 py-3 text-[14px] min-h-[120px] resize-y"
                placeholder="记录内容…"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[--text-secondary] mb-1.5">标签（可选，逗号分隔）</label>
              <input
                className="sf-input w-full px-4 py-2.5 text-[14px]"
                placeholder="例：排序, 算法"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
              />
            </div>
            {error && (
              <div className="rounded-2xl px-3 py-2.5 text-[13px] bg-[#c45c5c]/10 text-[#8b4a4a] dark:text-[#e8a8a8] shadow-[0_0_0_1px_rgba(196,92,92,0.2)]">
                {error}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={adding || !newContent.trim()}
                className="sf-btn-primary rounded-full px-5 py-2 text-[14px] disabled:opacity-40 disabled:pointer-events-none"
              >
                {adding ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="sf-btn-secondary rounded-full px-5 py-2 text-[14px]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="space-y-4 animate-pulse" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="sf-card rounded-2xl p-5">
              <div className="sf-skeleton h-4 w-1/2 mb-3" />
              <div className="sf-skeleton h-3 w-full mb-2" />
              <div className="sf-skeleton h-3 w-full mb-2" />
              <div className="sf-skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="sf-card rounded-2xl p-10 text-center">
          <img src="/images/platform/empty-note.png" alt="" className="w-28 h-28 mx-auto mb-5 object-contain opacity-95" />
          <p className="text-[15px] text-[--text-secondary] leading-relaxed max-w-sm mx-auto">
            暂无记录，点击「添加记录」写下第一条笔记
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div key={r.id} className="sf-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {r.title && (
                    <h3 className="text-[15px] font-semibold text-[--text-primary] mb-1">{r.title}</h3>
                  )}
                  <p className="text-[14px] text-[--text-secondary] whitespace-pre-wrap">{r.content}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.tags.map((tag) => (
                          <span key={tag} className="sf-badge text-[11px] py-0.5 px-2.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {r.created_at && (
                      <span className="text-[11px] text-[--text-muted] shrink-0">
                        {new Date(r.created_at).toLocaleDateString("zh-CN")}
                      </span>
                    )}
                  </div>
                </div>
                {r.id > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteRecord(r.id)}
                    disabled={deleting === r.id}
                    className="sf-btn-danger rounded-full text-[11px] py-1.5 px-2.5 shrink-0 disabled:opacity-50"
                  >
                    {deleting === r.id ? "…" : "删除"}
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
