"""深度解题模式 - 多步推理与自检"""
import json
import logging
from collections.abc import AsyncGenerator

from backend.services.knowledge_service import search_legacy
from backend.services.llm_router import chat_completion_stream

logger = logging.getLogger("xin-ai.deep-solve")

_STEPS = ("plan", "investigate", "solve", "verify")


def _format_context(items: list[dict]) -> str:
    if not items:
        return "（暂无知识库命中）"
    return "\n\n".join(
        f"[{i + 1}] 问：{item.get('question', '')}\n答：{item.get('answer', '')}" for i, item in enumerate(items)
    )


def _format_history(history: list[dict]) -> str:
    if not history:
        return ""
    lines = []
    for h in history[-12:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


class DeepSolveMode:
    name = "deep_solve"
    description = "分步规划、检索、解答与验证"

    async def process(
        self,
        question: str,
        context: list[dict],
        history: list[dict],
    ) -> AsyncGenerator[dict, None]:
        hist = _format_history(history)
        base_ctx = _format_context(context)

        prompts = {
            "plan": (
                "你是教学助理。请将用户问题分解为若干清晰的子问题或解题步骤，使用编号列表，简洁中文。\n"
                "只输出规划内容，不要解答。"
            ),
            "investigate": (
                "根据下方【知识库摘录】与【解题规划】，列出解题所需的关键事实、公式或条件；"
                "若资料不足，明确标注“资料未覆盖”并说明还缺什么。使用简洁中文条目。"
            ),
            "solve": (
                "你是教学助理。综合【知识库摘录】【解题规划】【调研要点】，给出完整解答。"
                "引用资料时用 [1][2] 形式标注出处（与摘录编号对应）。语气清晰、分步书写。"
            ),
            "verify": (
                "请对已给出的解答做自检：逻辑是否连贯、是否与知识库矛盾、是否有遗漏。"
                "用简短中文列出结论（通过/需修正）及理由；若有风险，给出改进建议。"
            ),
        }

        plan_text = ""
        investigate_text = ""
        solve_text = ""

        for step in _STEPS:
            yield {"type": "step_start", "step": step}

            if step == "plan":
                user_msg = f"【用户问题】\n{question}\n"
                if hist:
                    user_msg += f"\n【近期对话】\n{hist}\n"
                user_msg += f"\n【已有参考资料】\n{base_ctx}\n"
                messages = [
                    {"role": "system", "content": prompts["plan"]},
                    {"role": "user", "content": user_msg},
                ]
                buf: list[str] = []
                try:
                    async for delta in chat_completion_stream(messages=messages, temperature=0.4):
                        buf.append(delta)
                        yield {"type": "delta", "step": step, "content": delta}
                    plan_text = "".join(buf)
                except Exception as e:
                    logger.error("深度解题 Plan 失败: %s", e, exc_info=True)
                    err = "规划步骤生成失败，请稍后重试。"
                    yield {"type": "delta", "step": step, "content": err}
                    yield {"type": "error", "step": step, "content": err}
                    yield {"type": "step_end", "step": step}
                    return
                yield {"type": "step_end", "step": step}
                continue

            if step == "investigate":
                search_query = f"{question}\n{plan_text[:500]}"
                kb_hits = search_legacy(search_query.strip(), top_k=5)
                merged_ctx = kb_hits if kb_hits else context
                ctx_block = _format_context(merged_ctx)
                user_msg = (
                    f"【用户问题】\n{question}\n\n【解题规划】\n{plan_text}\n\n【知识库摘录】\n{ctx_block}\n"
                )
                messages = [
                    {"role": "system", "content": prompts["investigate"]},
                    {"role": "user", "content": user_msg},
                ]
                buf = []
                try:
                    async for delta in chat_completion_stream(messages=messages, temperature=0.3):
                        buf.append(delta)
                        yield {"type": "delta", "step": step, "content": delta}
                    investigate_text = "".join(buf)
                except Exception as e:
                    logger.error("深度解题 Investigate 失败: %s", e, exc_info=True)
                    err = "调研步骤失败，请稍后重试。"
                    yield {"type": "delta", "step": step, "content": err}
                    yield {"type": "error", "step": step, "content": err}
                    yield {"type": "step_end", "step": step}
                    return
                yield {"type": "step_end", "step": step}
                continue

            if step == "solve":
                ctx_block = _format_context(context)
                user_msg = (
                    f"【用户问题】\n{question}\n\n【解题规划】\n{plan_text}\n\n"
                    f"【调研要点】\n{investigate_text}\n\n【知识库摘录】\n{ctx_block}\n"
                )
                messages = [
                    {"role": "system", "content": prompts["solve"]},
                    {"role": "user", "content": user_msg},
                ]
                buf = []
                try:
                    async for delta in chat_completion_stream(messages=messages, temperature=0.5):
                        buf.append(delta)
                        yield {"type": "delta", "step": step, "content": delta}
                    solve_text = "".join(buf)
                except Exception as e:
                    logger.error("深度解题 Solve 失败: %s", e, exc_info=True)
                    err = "解答生成失败，请稍后重试。"
                    yield {"type": "delta", "step": step, "content": err}
                    yield {"type": "error", "step": step, "content": err}
                    yield {"type": "step_end", "step": step}
                    return
                yield {"type": "step_end", "step": step}
                continue

            if step == "verify":
                user_msg = (
                    f"【用户问题】\n{question}\n\n【解题规划】\n{plan_text}\n\n"
                    f"【调研要点】\n{investigate_text}\n\n【当前解答】\n{solve_text}\n\n"
                    f"【知识库摘录】\n{base_ctx}\n"
                )
                messages = [
                    {"role": "system", "content": prompts["verify"]},
                    {"role": "user", "content": user_msg},
                ]
                try:
                    async for delta in chat_completion_stream(messages=messages, temperature=0.2):
                        yield {"type": "delta", "step": step, "content": delta}
                except Exception as e:
                    logger.error("深度解题 Verify 失败: %s", e, exc_info=True)
                    err = "验证步骤失败，请稍后重试。"
                    yield {"type": "delta", "step": step, "content": err}
                    yield {"type": "error", "step": step, "content": err}
                yield {"type": "step_end", "step": step}

        yield {
            "type": "summary",
            "content": json.dumps(
                {"plan": plan_text, "investigate": investigate_text, "solve": solve_text},
                ensure_ascii=False,
            ),
        }
        yield {"type": "done"}
