"""AI 协同写作"""
import logging

from backend.services.llm_router import chat_completion

logger = logging.getLogger("xin-ai.cowriter")


def _format_kb(ctx: list[dict] | None) -> str:
    if not ctx:
        return ""
    return "\n\n".join(
        f"问：{c.get('question', '')}\n答：{c.get('answer', '')}" for c in ctx[:12]
    )


async def rewrite(
    text: str,
    instruction: str,
    knowledge_context: list[dict] | None = None,
) -> str:
    kb = _format_kb(knowledge_context)
    system = "你是中文写作编辑。按用户指令改写原文，保持事实一致，输出改写后的正文，不要前言后语。"
    user = f"【原文】\n{text}\n\n【改写要求】\n{instruction}\n"
    if kb:
        user += f"\n【可参考知识】\n{kb}\n"
    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.55,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error("rewrite 失败: %s", e, exc_info=True)
        return "改写失败，请稍后重试。"


async def expand(text: str, knowledge_context: list[dict] | None = None) -> str:
    kb = _format_kb(knowledge_context)
    system = "你是中文写作助手。在保持原意前提下扩写，补充细节与例证，结构清晰，直接输出扩写结果。"
    user = f"【原文】\n{text}\n"
    if kb:
        user += f"\n【可参考知识】\n{kb}\n"
    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.55,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error("expand 失败: %s", e, exc_info=True)
        return "扩写失败，请稍后重试。"


async def summarize(text: str) -> str:
    system = "你是中文摘要助手。用简洁中文概括要点，条列或小段皆可，直接输出摘要。"
    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": text}],
            temperature=0.3,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error("summarize 失败: %s", e, exc_info=True)
        return "摘要失败，请稍后重试。"


async def translate(text: str, target_language: str) -> str:
    system = (
        f"你是翻译。将用户文本译为「{target_language}」，保持语气与术语准确，只输出译文。"
    )
    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": text}],
            temperature=0.3,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception as e:
        logger.error("translate 失败: %s", e, exc_info=True)
        return "翻译失败，请稍后重试。"
