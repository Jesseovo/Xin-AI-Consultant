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
      <div className="mb-6">
        <button onClick={() => router.push("/notebook")} className="text-[13px] text-[--accent] mb-3 inline-block hover:underline">
          ← 返回笔记本列表
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-[--text-primary] tracking-tight">笔记记录</h1>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 rounded-xl bg-[--accent] text-white text-[13px] font-medium transition-opacity hover:opacity-90"
          >
            + 添加记录
          </button>
        </div>
      </div>

      {isDemo && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200">
          演示模式 — 后端不可用
        </div>
      )}

      {/* Add record form */}
      {showAdd && (
        <div className="sf-card rounded-2xl p-6 mb-6 border border-[--border-subtle]">
          <h2 className="text-[16px] font-semibold text-[--text-primary] mb-4">添加笔记</h2>
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
              <div className="text-[13px] text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={adding || !newContent.trim()}
                className="px-5 py-2 rounded-xl bg-[--accent] text-white text-[14px] font-medium disabled:opacity-40"
              >
                {adding ? "保存中…" : "保存"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-5 py-2 rounded-xl border border-[--border-subtle] text-[14px] text-[--text-secondary]"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records */}
      {loading ? (
        <p className="text-[14px] text-[--text-muted]">加载中…</p>
      ) : records.length === 0 ? (
        <div className="sf-card rounded-2xl p-8 text-center border border-[--border-subtle]">
          <img src="/images/platform/empty-note.png" alt="" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <p className="text-[14px] text-[--text-secondary]">暂无记录，点击"添加记录"开始</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div key={r.id} className="sf-card rounded-xl p-5 border border-[--border-subtle]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {r.title && (
                    <h3 className="text-[15px] font-medium text-[--text-primary] mb-1">{r.title}</h3>
                  )}
                  <p className="text-[14px] text-[--text-secondary] whitespace-pre-wrap">{r.content}</p>
                  <div className="flex items-center gap-3 mt-3">
                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 text-[11px] rounded-full bg-[--accent]/10 text-[--accent]">
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
                    className="text-[12px] text-red-500 hover:text-red-600 transition-colors shrink-0"
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
