"""引导式学习 API"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.deps import get_current_user
from backend.services.chat_modes.guided_mode import create_learning_plan, generate_step_content
from backend.services.knowledge_service import search_legacy

logger = logging.getLogger("xin-ai.api.guided")

router = APIRouter()


class GuidedPlanRequest(BaseModel):
    topic: str
    num_steps: int = Field(default=4, ge=2, le=12)
    use_kb: bool = True


class GuidedStepContentRequest(BaseModel):
    step: dict
    topic_hint: str | None = None
    use_kb: bool = True


@router.post("/plan")
async def create_plan(
    req: GuidedPlanRequest,
    user=Depends(get_current_user),
):
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="主题不能为空")

    ctx = search_legacy(topic, top_k=8) if req.use_kb else []

    try:
        data = await create_learning_plan(topic, ctx, num_steps=req.num_steps)
    except Exception as e:
        logger.error("学习计划生成异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="服务暂时不可用，请稍后重试。") from e

    if not data.get("steps"):
        raise HTTPException(
            status_code=422,
            detail=data.get("message") or "未能生成学习计划，请更换主题后重试。",
        )

    return data


@router.post("/step-content")
async def step_content(
    req: GuidedStepContentRequest,
    user=Depends(get_current_user),
):
    if not req.step:
        raise HTTPException(status_code=400, detail="步骤内容不能为空")

    hint = (req.topic_hint or req.step.get("title") or "").strip()
    ctx = search_legacy(hint, top_k=6) if req.use_kb and hint else []

    try:
        return await generate_step_content(req.step, ctx)
    except Exception as e:
        logger.error("步骤内容生成异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="服务暂时不可用，请稍后重试。") from e
