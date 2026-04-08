"""学生学习画像与记忆上下文"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.memory import MemoryProfile
from backend.services.llm_router import chat_completion

logger = logging.getLogger("xin-ai.memory")


async def get_or_create_profile(
    user_id: int,
    bot_id: int | None,
    db: AsyncSession,
) -> MemoryProfile:
    result = await db.execute(
        select(MemoryProfile).where(
            MemoryProfile.user_id == user_id,
            MemoryProfile.bot_id == bot_id,
        )
    )
    profile = result.scalar_one_or_none()
    if profile:
        return profile

    profile = MemoryProfile(user_id=user_id, bot_id=bot_id, summary=None, profile_data=None)
    db.add(profile)
    await db.flush()
    return profile


async def update_summary(
    profile: MemoryProfile,
    new_interaction: str,
    db: AsyncSession,
) -> None:
    prev = (profile.summary or "").strip()
    messages = [
        {
            "role": "system",
            "content": (
                "你是学习档案助手。根据「已有摘要」与「本轮师生互动摘录」，用中文输出更新后的摘要，"
                "严格控制在 2～3 句，只写学生已掌握什么、仍薄弱什么、学习偏好或进度要点；"
                "不要复述对话原文，不要标题或列表符号。"
            ),
        },
        {
            "role": "user",
            "content": f"已有摘要：\n{prev or '（尚无）'}\n\n本轮互动摘录：\n{new_interaction[:4000]}",
        },
    ]
    try:
        response = await chat_completion(messages=messages, temperature=0.3, max_tokens=400)
        text = (response.choices[0].message.content or "").strip()
        if text:
            profile.summary = text
            await db.commit()
    except Exception as e:
        logger.warning("更新学习摘要失败: %s", e, exc_info=True)
        await db.rollback()


async def get_context_from_memory(
    user_id: int,
    bot_id: int | None,
    db: AsyncSession,
) -> str:
    result = await db.execute(
        select(MemoryProfile).where(
            MemoryProfile.user_id == user_id,
            MemoryProfile.bot_id == bot_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile or not (profile.summary or "").strip():
        return ""
    return (
        f"【学习画像摘要】\n{profile.summary.strip()}\n"
        f"请在回答中保持与上述学习进度的一致性与连贯性。"
    )
