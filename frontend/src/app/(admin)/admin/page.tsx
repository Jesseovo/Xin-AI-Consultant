"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface AdminOverview {
  health?: { ok: boolean; message?: string };
  llm?: { provider?: string; model?: string };
  users_by_role?: { student: number; teacher: number; admin: number };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<AdminOverview>("/admin/overview");
      setData(res);
    } catch {
      setData({
        health: { ok: true, message: "演示数据" },
        llm: { provider: "OpenAI 兼容", model: "gpt-4o-mini" },
        users_by_role: { student: 120, teacher: 18, admin: 2 },
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.post("/admin/test-llm", {});
      setTestResult("连接成功");
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "连接失败（后端未就绪时可忽略）");
    } finally {
      setTesting(false);
    }
  };

  const h = data?.health;
  const llm = data?.llm;
  const ur = data?.users_by_role;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary]">管理总览</h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-8">系统健康与模型配置</p>

      <div className="sf-card rounded-2xl p-6 mb-6">
        <h2 className="text-[14px] font-semibold text-[--text-primary] mb-2">服务状态</h2>
        <p className="text-[13px] text-[--text-secondary]">
          {h?.ok !== false ? (
            <span className="text-[--accent-secondary]">● 正常</span>
          ) : (
            <span className="text-red-500">● 异常</span>
          )}
          {h?.message && <span className="ml-2">{h.message}</span>}
        </p>
      </div>

      <div className="sf-card rounded-2xl p-6 mb-6">
        <h2 className="text-[14px] font-semibold text-[--text-primary] mb-2">大模型</h2>
        <p className="text-[13px] text-[--text-secondary]">
          提供商：{llm?.provider ?? "—"}
          <br />
          模型：{llm?.model ?? "—"}
        </p>
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={testing}
          className="mt-4 px-4 py-2 rounded-xl bg-[--accent] text-[--accent-text] text-[13px] disabled:opacity-50"
        >
          {testing ? "测试中…" : "测试连接"}
        </button>
        {testResult && <p className="mt-2 text-[12px] text-[--text-muted]">{testResult}</p>}
      </div>

      <div className="sf-glass rounded-2xl p-6">
        <h2 className="text-[14px] font-semibold text-[--text-primary] mb-4">用户统计</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[22px] font-semibold text-[--text-primary]">{ur?.student ?? "—"}</p>
            <p className="text-[12px] text-[--text-muted]">学生</p>
          </div>
          <div>
            <p className="text-[22px] font-semibold text-[--text-primary]">{ur?.teacher ?? "—"}</p>
            <p className="text-[12px] text-[--text-muted]">教师</p>
          </div>
          <div>
            <p className="text-[22px] font-semibold text-[--text-primary]">{ur?.admin ?? "—"}</p>
            <p className="text-[12px] text-[--text-muted]">管理员</p>
          </div>
        </div>
      </div>
    </div>
  );
}
