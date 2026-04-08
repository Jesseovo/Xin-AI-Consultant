"""深度调研 API（SSE）"""
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.deps import get_current_user
from backend.services.chat_modes.research_mode import research
from backend.services.knowledge_service import search_legacy

logger = logging.getLogger("xin-ai.api.research")

router = APIRouter()


class ResearchRequest(BaseModel):
    topic: str = Field(..., min_length=1)
    use_kb: bool = True


@router.post("/")
async def start_research(
    req: ResearchRequest,
    user=Depends(get_current_user),
):
    topic = req.topic.strip()
    ctx = search_legacy(topic, top_k=8) if req.use_kb else []

    async def events() -> AsyncIterator[str]:
        try:
            async for chunk in research(topic, ctx):
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error("调研流异常: %s", e, exc_info=True)
            err = {"type": "error", "content": "调研过程出现异常，请稍后重试。"}
            yield f"data: {json.dumps(err, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
