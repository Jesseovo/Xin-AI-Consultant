const API_BASE = "/api/v1";

function joinUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export class ApiClient {
  private token: string | null = null;

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  getToken(): string | null {
    return this.token;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(joinUrl(path), { headers: this.headers() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(joinUrl(path), {
      method: "POST",
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(joinUrl(path), {
      method: "PUT",
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async del<T = unknown>(path: string): Promise<T> {
    const res = await fetch(joinUrl(path), {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText || `HTTP ${res.status}`);
    }
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }
    const ct = res.headers.get("content-type");
    if (ct?.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return undefined as T;
  }

  /**
   * POST with SSE-style streaming: reads response body as text, parses `data:` lines as JSON.
   */
  async postStream(
    path: string,
    body: unknown,
    onChunk: (data: unknown) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): Promise<void> {
    try {
      const res = await fetch(joinUrl(path), {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        onError(text || res.statusText || `HTTP ${res.status}`);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        onError("无法读取响应流");
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]" || payload === "") continue;
          try {
            onChunk(JSON.parse(payload));
          } catch {
            onChunk({ raw: payload });
          }
        }
      }
      const rest = buffer.trim();
      if (rest.startsWith("data:")) {
        const payload = rest.slice(5).trim();
        if (payload && payload !== "[DONE]") {
          try {
            onChunk(JSON.parse(payload));
          } catch {
            onChunk({ raw: payload });
          }
        }
      }
      onDone();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  }
}

export const api = new ApiClient();
