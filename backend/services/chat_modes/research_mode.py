"""深度调研模式 - 子主题检索与综合报告"""
import json
import logging
import re
from collections.abc import AsyncGenerator

from backend.services.knowledge_service import search_legacy
from backend.services.llm_router import chat_completion, chat_completion_stream

logger = logging.getLogger("xin-ai.research-mode")


def _parse_json_object(text: str) -> dict | list | None:
    if not text:
        return None
    t = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", t)
    if m:
        t = m.group(1).strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        start, end = t.find("["), t.rfind("]")
        if start >= 0 and end > start:
            try:
                return json.loads(t[start : end + 1])
            except json.JSONDecodeError:
                pass
        start, end = t.find("{"), t.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(t[start : end + 1])
            except json.JSONDecodeError:
                pass
    return None


def _format_context(items: list[dict]) -> str:
    if not items:
        return "（无命中条目）"
    return "\n\n".join(
        f"[{i + 1}] 问：{item.get('question', '')}\n答：{item.get('answer', '')}"
        for i, item in enumerate(items)
    )


async def research(
    topic: str,
    knowledge_context: list[dict],
) -> AsyncGenerator[dict, None]:
    decompose_system = (
        "你是研究助理。将用户主题拆成 3-5 个子主题，用于分别检索与综述。"
        "只输出 JSON 数组，每个元素为字符串（子主题名称），中文，不要其它文字。"
    )
    subtopics: list[str] = []
    try:
        resp = await chat_completion(
            messages=[
                {"role": "system", "content": decompose_system},
                {"role": "user", "content": f"主题：{topic}"},
            ],
            temperature=0.4,
        )
        raw = resp.choices[0].message.content or ""
        parsed = _parse_json_object(raw)
        if isinstance(parsed, list):
            subtopics = [str(x).strip() for x in parsed if str(x).strip()][:5]
        elif isinstance(parsed, dict) and "subtopics" in parsed:
            subtopics = [str(x).strip() for x in parsed["subtopics"] if str(x).strip()][:5]
    except Exception as e:
        logger.error("research 拆分子主题失败: %s", e, exc_info=True)

    if not subtopics:
        subtopics = [topic, f"{topic}：背景与定义", f"{topic}：关键要点"]

    sections: list[dict] = []

    for idx, sub in enumerate(subtopics):
        yield {"type": "subtopic_start", "index": idx, "subtopic": sub}

        hits = search_legacy(sub, top_k=4)
        if not hits and knowledge_context:
            hits = knowledge_context[:4]
        ctx_block = _format_context(hits)

        synth_system = (
            "根据【子主题】与【知识库摘录】写一段简明综述，中文。"
            "引用资料时在句末用 [1][2] 标注（与摘录编号对应）。若无资料，说明依据常识推理并标注不确定性。"
        )
        user_msg = f"【总主题】{topic}\n【子主题】{sub}\n\n【知识库摘录】\n{ctx_block}\n"

        section_text = ""
        try:
            async for delta in chat_completion_stream(
                messages=[{"role": "system", "content": synth_system}, {"role": "user", "content": user_msg}],
                temperature=0.45,
            ):
                section_text += delta
                yield {"type": "delta", "subtopic": sub, "content": delta}
        except Exception as e:
            logger.error("research 子主题综合失败: %s", e, exc_info=True)
            err = "该子主题综述生成失败。"
            yield {"type": "delta", "subtopic": sub, "content": err}
            section_text = err

        sections.append({"subtopic": sub, "content": section_text, "sources": hits})
        yield {"type": "subtopic_end", "index": idx, "subtopic": sub}

    report_system = (
        "你是学术写作助理。根据给定的多段子主题综述，写一份完整【调研报告】，中文。"
        "结构：一、概述 二、分主题要点（保留引用标记如 [1]） 三、总结与建议。"
        "语气客观，不要编造具体数据。"
    )
    report_input = json.dumps(
        {"topic": topic, "sections": [{"title": s["subtopic"], "body": s["content"]} for s in sections]},
        ensure_ascii=False,
    )

    yield {"type": "report_start"}

    full_report = ""
    try:
        async for delta in chat_completion_stream(
            messages=[{"role": "system", "content": report_system}, {"role": "user", "content": report_input}],
            temperature=0.4,
        ):
            full_report += delta
            yield {"type": "delta", "phase": "report", "content": delta}
    except Exception as e:
        logger.error("research 总报告失败: %s", e, exc_info=True)
        err = "调研报告合成失败，请稍后重试。"
        full_report = err
        yield {"type": "delta", "phase": "report", "content": err}

    yield {
        "type": "report_complete",
        "topic": topic,
        "report": full_report,
        "sections": sections,
    }
    yield {"type": "done"}
