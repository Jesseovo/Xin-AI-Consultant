/**
 * Merge common SSE JSON payload shapes into accumulated assistant text.
 */
export function mergeStreamChunk(acc: string, data: unknown): string {
  if (data == null) return acc;
  if (typeof data === "string") return acc + data;
  if (typeof data !== "object") return acc;
  const o = data as Record<string, unknown>;
  if (typeof o.raw === "string") return acc + o.raw;

  const delta =
    (typeof o.delta === "string" ? o.delta : undefined) ??
    (typeof o.content === "string" && o.type !== "sources" ? (o.content as string) : undefined) ??
    (typeof o.text === "string" ? o.text : undefined);
  if (delta) return acc + delta;

  const choices = o.choices as Array<{ delta?: { content?: string } }> | undefined;
  const c = choices?.[0]?.delta?.content;
  if (typeof c === "string" && c.length > 0) return acc + c;

  return acc;
}

export function extractSources(data: unknown): Array<{ title?: string; url?: string; snippet?: string }> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (!Array.isArray(o.sources)) return null;
  return o.sources as Array<{ title?: string; url?: string; snippet?: string }>;
}
