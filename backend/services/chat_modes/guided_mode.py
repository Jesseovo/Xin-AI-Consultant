"""引导式学习路径"""
import json
import logging
import re

from backend.services.llm_router import chat_completion

logger = logging.getLogger("xin-ai.guided-mode")


def _parse_json_object(text: str) -> dict | None:
    if not text:
        return None
    t = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", t)
    if m:
        t = m.group(1).strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        start, end = t.find("{"), t.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(t[start : end + 1])
            except json.JSONDecodeError:
                pass
    return None


def _format_kb(ctx: list[dict]) -> str:
    if not ctx:
        return "（无知识库片段，请基于主题设计通用学习路径。）"
    return "\n\n".join(
        f"问：{c.get('question', '')}\n答：{c.get('answer', '')}" for c in ctx[:15]
    )


async def create_learning_plan(
    topic: str,
    knowledge_context: list[dict],
    num_steps: int = 4,
) -> dict:
    kb = _format_kb(knowledge_context)
    system = (
        "你是课程设计师。只输出一个 JSON 对象。"
        "结构：{\"topic\": string, \"steps\": [{\"title\": string, \"description\": string, \"key_points\": [string]}]}。"
        f"steps 恰好 {num_steps} 步，key_points 每步 2-4 条，全中文。"
    )
    user = f"学习主题：{topic}\n\n【参考资料】\n{kb}\n"

    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.5,
        )
        raw = resp.choices[0].message.content or ""
        data = _parse_json_object(raw)
        if not data or "steps" not in data:
            return {"topic": topic, "steps": [], "message": "学习计划生成失败，请重试。"}
        data.setdefault("topic", topic)
        return data
    except Exception as e:
        logger.error("create_learning_plan 失败: %s", e, exc_info=True)
        return {"topic": topic, "steps": [], "message": "学习计划生成失败，请稍后重试。"}


async def generate_step_content(step: dict, knowledge_context: list[dict]) -> dict:
    kb = _format_kb(knowledge_context)
    step_json = json.dumps(step, ensure_ascii=False)
    system = (
        "你是讲师。只输出一个 JSON 对象。"
        "结构：{\"title\": string, \"html_content\": string, \"examples\": [string], \"discussion_prompts\": [string]}。"
        "html_content 为简短教学内容，可使用 <p>、<ul>、<li>、<strong>；examples 2-3 条；discussion_prompts 2 条讨论问题，全中文。"
    )
    user = f"当前步骤：{step_json}\n\n【参考资料】\n{kb}\n"

    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.55,
        )
        raw = resp.choices[0].message.content or ""
        data = _parse_json_object(raw)
        if not data:
            return {
                "title": step.get("title", ""),
                "html_content": "<p>内容生成失败，请重试。</p>",
                "examples": [],
                "discussion_prompts": [],
            }
        data.setdefault("title", step.get("title", ""))
        data.setdefault("html_content", "")
        data.setdefault("examples", [])
        data.setdefault("discussion_prompts", [])
        return data
    except Exception as e:
        logger.error("generate_step_content 失败: %s", e, exc_info=True)
        return {
            "title": step.get("title", ""),
            "html_content": "<p>内容生成失败，请稍后重试。</p>",
            "examples": [],
            "discussion_prompts": [],
        }
