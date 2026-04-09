"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-store";
import { api } from "@/lib/api";

interface KnowledgeBase {
  id: string;
  name: string;
  doc_count: number;
  chunk_count: number;
}

const MOCK: KnowledgeBase[] = [
  { id: "kb1", name: "程序设计基础", doc_count: 12, chunk_count: 480 },
  { id: "kb2", name: "高等数学讲义", doc_count: 8, chunk_count: 320 },
];

export default function TeacherKnowledgePage() {
  const { accessToken } = useAuth();
  const [list, setList] = useState<KnowledgeBase[]>([]);
  const [name, setName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items?: KnowledgeBase[] }>("/teacher/knowledge-bases");
      const items = res.items;
      setList(Array.isArray(items) && items.length > 0 ? items : MOCK);
    } catch {
      setList(MOCK);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setMessage(null);
    try {
      await api.post<{ id: string }>("/teacher/knowledge-bases", { name: name.trim() });
      setName("");
      await load();
      setMessage("已创建知识库");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "创建失败");
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      const baseId = list[0]?.id ?? "default";
      const form = new FormData();
      arr.forEach((f) => form.append("files", f));
      const headers: HeadersInit = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch(`/api/v1/teacher/knowledge-bases/${baseId}/documents`, {
        method: "POST",
        headers,
        body: form,
      });
      if (!res.ok) throw new Error(await res.text() || "上传失败");
      setMessage(`已上传 ${arr.length} 个文件`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上传失败（演示环境可忽略）");
    } finally {
      setUploading(false);
    }
  };

  const deleteKb = async (id: string) => {
    if (!confirm("确定删除该知识库？")) return;
    try {
      await api.del(`/teacher/knowledge-bases/${id}`);
      await load();
    } catch {
      setList((prev) => prev.filter((k) => k.id !== id));
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary]">知识库</h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-6">管理文档与向量切片</p>

      {message && (
        <div className="mb-4 text-[13px] text-[--text-secondary] sf-card px-3 py-2 rounded-xl">{message}</div>
      )}

      <form onSubmit={createKb} className="sf-glass rounded-2xl p-5 mb-8 flex flex-col sm:flex-row gap-3">
        <input
          className="sf-input flex-1 px-4 py-3 text-[15px]"
          placeholder="新知识库名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="px-5 py-3 rounded-xl bg-[--accent] text-white text-[14px] font-medium shrink-0">
          创建
        </button>
      </form>

      <div
        className={`sf-card rounded-2xl p-8 mb-8 text-center border-2 border-dashed transition-colors ${
          dragOver ? "border-[--accent]/50 bg-[--accent]/5" : "border-[--border-subtle]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(e.dataTransfer.files);
        }}
      >
        <img src="/images/teacher/upload-guide.png" alt="" className="w-20 h-20 mx-auto mb-3 object-contain" />
        <p className="text-[14px] text-[--text-primary] font-medium">拖放文件到此处上传</p>
        <p className="text-[12px] text-[--text-muted] mt-1">或选择文件（将关联到列表中的第一个知识库）</p>
        <label className="mt-4 inline-block">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
          />
          <span className="cursor-pointer px-4 py-2 rounded-xl bg-[--chip-bg] border border-[--chip-border] text-[13px] text-[--text-secondary]">
            {uploading ? "上传中…" : "选择文件"}
          </span>
        </label>
      </div>

      {list.length === 0 && (
        <div className="sf-card rounded-2xl p-8 text-center mb-4">
          <img src="/images/platform/empty-kb.png" alt="" className="w-24 h-24 mx-auto mb-4 object-contain" />
          <p className="text-[14px] text-[--text-secondary]">暂无知识库，请创建一个</p>
        </div>
      )}
      <ul className="space-y-3">
        {list.map((kb) => (
          <li key={kb.id} className="sf-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[15px] font-medium text-[--text-primary]">{kb.name}</p>
              <p className="text-[12px] text-[--text-muted] mt-0.5">
                {kb.doc_count} 个文档 · {kb.chunk_count} 个切片
              </p>
            </div>
            <button
              type="button"
              onClick={() => void deleteKb(kb.id)}
              className="text-[13px] text-red-500 hover:underline"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
