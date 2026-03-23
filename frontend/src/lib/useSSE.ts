"use client";

import { useRef, useCallback, useState } from "react";

interface SSEEvent {
  type: "meta" | "delta" | "done" | "error";
  content?: string;
  can_answer?: boolean;
  sources?: Array<{ question: string; answer: string; score: number }>;
  teacher_contact?: { name: string; contact: string; type: string } | null;
}

interface UseSSEReturn {
  sendStream: (
    question: string,
    callbacks: {
      onMeta?: (evt: SSEEvent) => void;
      onDelta?: (chunk: string, accumulated: string) => void;
      onDone?: (fullText: string) => void;
      onError?: (message: string) => void;
    }
  ) => Promise<void>;
  isStreaming: boolean;
  abort: () => void;
}

export function useSSE(): UseSSEReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendStream = useCallback(
    async (
      question: string,
      callbacks: {
        onMeta?: (evt: SSEEvent) => void;
        onDelta?: (chunk: string, accumulated: string) => void;
        onDone?: (fullText: string) => void;
        onError?: (message: string) => void;
      }
    ) => {
      abort();

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsStreaming(true);

      let accumulated = "";

      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || `服务异常 (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const evt: SSEEvent = JSON.parse(jsonStr);

              switch (evt.type) {
                case "meta":
                  callbacks.onMeta?.(evt);
                  break;
                case "delta":
                  if (evt.content) {
                    accumulated += evt.content;
                    callbacks.onDelta?.(evt.content, accumulated);
                  }
                  break;
                case "done":
                  callbacks.onDone?.(accumulated);
                  break;
                case "error":
                  callbacks.onError?.(evt.content ?? "未知错误");
                  break;
              }
            } catch {
              /* skip malformed JSON */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "网络连接失败，请检查后端服务是否启动。";
        callbacks.onError?.(msg);
      } finally {
        controllerRef.current = null;
        setIsStreaming(false);
      }
    },
    [abort]
  );

  return { sendStream, isStreaming, abort };
}
