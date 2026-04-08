"""协同写作 API"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.app.deps import get_current_user
from backend.services import cowriter_service
from backend.services.knowledge_service import search_legacy

logger = logging.getLogger("xin-ai.api.cowriter")

router = APIRouter()


class RewriteRequest(BaseModel):
    text: str = Field(..., min_length=1)
    instruction: str = Field(..., min_length=1)
    use_kb: bool = False
    kb_query: str | None = None


class ExpandRequest(BaseModel):
    text: str = Field(..., min_length=1)
    use_kb: bool = False
    kb_query: str | None = None


class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=1)


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1)
    target_language: str = Field(..., min_length=1)


def _kb_for_query(q: str | None, use_kb: bool) -> list[dict] | None:
    if not use_kb:
        return None
    query = (q or "").strip()
    if not query:
        return []
    return search_legacy(query, top_k=6)


@router.post("/rewrite")
async def rewrite_text(
    req: RewriteRequest,
    user=Depends(get_current_user),
):
    try:
        ctx = _kb_for_query(req.kb_query or req.text[:200], req.use_kb)
        out = await cowriter_service.rewrite(req.text, req.instruction, ctx)
    except Exception as e:
        logger.error("rewrite 接口异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="服务暂时不可用，请稍后重试。") from e
    return {"text": out}


@router.post("/expand")
async def expand_text(
    req: ExpandRequest,
    user=Depends(get_current_user),
):
    try:
        ctx = _kb_for_query(req.kb_query or req.text[:200], req.use_kb)
        out = await cowriter_service.expand(req.text, ctx)
    except Exception as e:
        logger.error("expand 接口异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="服务暂时不可用，请稍后重试。") from e
    return {"text": out}


@router.post("/summarize")
async def summarize_text(
    req: SummarizeRequest,
    user=Depends(get_current_user),
):
    try:
        out = await cowriter_service.summarize(req.text)
    except Exception as e:
        logger.error("summarize 接口异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="服务暂时不可用，请稍后重试。") from e
    return {"text": out}


@router.post("/translate")
async def translate_text(
    req: TranslateRequest,
    user=Depends(get_current_user),
):
    try:
        out = await cowriter_service.translate(req.text, req.target_language)
    except Exception as e:
        logger.error("translate 接口异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="服务暂时不可用，请稍后重试。") from e
    return {"text": out}
