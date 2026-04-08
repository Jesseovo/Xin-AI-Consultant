"""TutorBot 端点"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.deps import get_db, get_current_user, get_current_teacher
from backend.models.tutorbot import TutorBot, TutorBotKnowledge
from backend.models.knowledge_base import KnowledgeBase
from backend.schemas.tutorbot import BotCreateRequest, BotUpdateRequest

router = APIRouter()


@router.get("/")
async def list_bots(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出所有公开的 TutorBot + 自己创建的"""
    result = await db.execute(
        select(TutorBot)
        .options(selectinload(TutorBot.teacher))
        .where(
            TutorBot.is_active == True,
            (TutorBot.is_public == True) | (TutorBot.teacher_id == user.id),
        )
        .order_by(TutorBot.usage_count.desc())
    )
    bots = result.scalars().all()
    return [
        {
            "id": b.id,
            "name": b.name,
            "avatar_url": b.avatar_url,
            "description": b.description,
            "subject_tags": b.subject_tags,
            "teaching_style": b.teaching_style,
            "is_public": b.is_public,
            "usage_count": b.usage_count,
            "teacher_name": b.teacher.display_name if b.teacher else None,
            "is_mine": b.teacher_id == user.id,
        }
        for b in bots
    ]


@router.post("/")
async def create_bot(
    req: BotCreateRequest,
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    bot = TutorBot(
        teacher_id=user.id,
        name=req.name,
        description=req.description,
        subject_tags=req.subject_tags,
        persona=req.persona,
        teaching_style=req.teaching_style,
        system_prompt=req.system_prompt,
        is_public=req.is_public,
    )
    db.add(bot)
    await db.flush()

    if req.kb_ids:
        for kb_id in req.kb_ids:
            kb_check = await db.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.id == kb_id,
                    KnowledgeBase.owner_id == user.id,
                )
            )
            if not kb_check.scalar_one_or_none():
                raise HTTPException(status_code=400, detail=f"知识库 {kb_id} 不存在或无权使用")
            db.add(TutorBotKnowledge(bot_id=bot.id, kb_id=kb_id))

    await db.commit()
    await db.refresh(bot)
    return {"id": bot.id, "name": bot.name, "message": "TutorBot 创建成功"}


@router.get("/{bot_id}")
async def get_bot(
    bot_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorBot).options(selectinload(TutorBot.teacher)).where(TutorBot.id == bot_id)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="TutorBot 不存在")
    if not bot.is_public and bot.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="无权访问")

    return {
        "id": bot.id,
        "name": bot.name,
        "avatar_url": bot.avatar_url,
        "description": bot.description,
        "subject_tags": bot.subject_tags,
        "persona": bot.persona,
        "teaching_style": bot.teaching_style,
        "system_prompt": bot.system_prompt if bot.teacher_id == user.id else None,
        "is_public": bot.is_public,
        "usage_count": bot.usage_count,
        "teacher_name": bot.teacher.display_name if bot.teacher else None,
    }


@router.put("/{bot_id}")
async def update_bot(
    bot_id: int,
    req: BotUpdateRequest,
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorBot).where(TutorBot.id == bot_id, TutorBot.teacher_id == user.id)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="TutorBot 不存在或无权修改")

    update_data = req.model_dump(exclude_unset=True, exclude={"kb_ids"})
    for key, value in update_data.items():
        setattr(bot, key, value)

    if req.kb_ids is not None:
        await db.execute(
            TutorBotKnowledge.__table__.delete().where(TutorBotKnowledge.bot_id == bot_id)
        )
        for kb_id in req.kb_ids:
            db.add(TutorBotKnowledge(bot_id=bot.id, kb_id=kb_id))

    await db.commit()
    return {"message": "TutorBot 更新成功"}


@router.delete("/{bot_id}")
async def delete_bot(
    bot_id: int,
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorBot).where(TutorBot.id == bot_id, TutorBot.teacher_id == user.id)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="TutorBot 不存在或无权删除")

    bot.is_active = False
    await db.commit()
    return {"message": "TutorBot 已删除"}
