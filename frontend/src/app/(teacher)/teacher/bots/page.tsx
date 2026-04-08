"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface TeacherBot {
  id: string;
  name: string;
  description: string;
  subject_tags: string[];
  usage_count: number;
}

const PERSONA_TEMPLATES = [
  { id: "tutor", label: "耐心助教", hint: "循序渐进、多举例" },
  { id: "coach", label: "竞赛教练", hint: "强调思路与限时训练" },
  { id: "socratic", label: "苏格拉底式", hint: "反问引导、自主思考" },
];

const MOCK: TeacherBot[] = [
  { id: "1", name: "高数助教 Xin", description: "习题与概念讲解", subject_tags: ["数学"], usage_count: 120 },
];

export default function TeacherBotsPage() {
  const [bots, setBots] = useState<TeacherBot[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [persona, setPersona] = useState(PERSONA_TEMPLATES[0].id);
  const [tags, setTags] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ items?: TeacherBot[] }>("/teacher/bots");
      const items = res.items;
      setBots(Array.isArray(items) && items.length > 0 ? items : MOCK);
    } catch {
      setBots(MOCK);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.post("/teacher/bots", {
        name: name.trim(),
        description: description.trim(),
        persona_template: persona,
        subject_tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      });
      setName("");
      setDescription("");
      setTags("");
      await load();
      setMsg("已创建机器人");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "创建失败");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary]">我的机器人</h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-6">创建与管理 TutorBot</p>

      {msg && <div className="mb-4 text-[13px] sf-card px-3 py-2 rounded-xl text-[--text-secondary]">{msg}</div>}

      <form onSubmit={createBot} className="sf-glass rounded-2xl p-6 mb-10 space-y-4">
        <h2 className="text-[15px] font-semibold text-[--text-primary]">新建机器人</h2>
        <div>
          <label className="text-[12px] text-[--text-secondary]">名称</label>
          <input className="sf-input w-full mt-1 px-4 py-3 text-[15px]" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-[12px] text-[--text-secondary]">描述</label>
          <textarea className="sf-input w-full mt-1 px-4 py-3 text-[15px] min-h-[88px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div>
          <label className="text-[12px] text-[--text-secondary]">人格模板</label>
          <select
            className="sf-input w-full mt-1 px-4 py-3 text-[15px]"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          >
            {PERSONA_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.hint}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[12px] text-[--text-secondary]">学科标签（逗号分隔）</label>
          <input
            className="sf-input w-full mt-1 px-4 py-3 text-[15px]"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="数学, 高数"
          />
        </div>
        <button type="submit" className="w-full py-3 rounded-xl bg-[--accent] text-white text-[14px] font-medium">
          创建
        </button>
      </form>

      <ul className="space-y-3">
        {bots.map((b) => (
          <li key={b.id} className="sf-card rounded-2xl p-4">
            <p className="text-[16px] font-medium text-[--text-primary]">{b.name}</p>
            <p className="text-[13px] text-[--text-secondary] mt-1">{b.description}</p>
            <p className="text-[12px] text-[--text-muted] mt-2">
              {b.subject_tags.join(" · ")} · 使用 {b.usage_count} 次
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
