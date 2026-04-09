"use client";

import { useCallback, useRef, useState } from "react";

const DEFAULT_ACCEPT =
  ".pdf,.docx,.txt,.md,.xlsx,.json,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,text/csv";

export interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
}

export default function FileUploader({ onUpload, accept = DEFAULT_ACCEPT }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = useCallback((f: File | null | undefined) => {
    if (!f) return;
    setError(null);
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      pickFile(e.dataTransfer.files[0]);
    },
    [pickFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      pickFile(e.target.files?.[0]);
      e.target.value = "";
    },
    [pickFile]
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }, [file, onUpload]);

  return (
    <div className="w-full space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--border-subtle)",
          background: dragOver ? "var(--ambient-a)" : "var(--bg-card)",
        }}
      >
        <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={onInputChange} />
        <p className="text-[14px] font-medium text-[--text-primary]">拖放文件到此处，或点击选择</p>
        <p className="text-[12px] text-[--text-secondary] mt-1">支持 PDF、DOCX、TXT、MD、XLSX、JSON、CSV</p>
      </div>

      {file && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-[13px] text-[--text-primary] truncate flex-1 min-w-0" title={file.name}>
            已选择：{file.name}
          </p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => void handleUpload()}
            className="shrink-0 px-4 py-2 rounded-xl text-[13px] font-medium text-[--accent-text] disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            {uploading ? "上传中…" : "上传"}
          </button>
        </div>
      )}

      {error && <p className="text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
