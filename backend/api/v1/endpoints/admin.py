"""管理员端点"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.app.config import get_settings
from backend.app.deps import get_current_admin
from backend.core.security import create_access_token
from backend.services.llm_router import test_connection
from backend.services.knowledge_service import get_legacy_stats, get_legacy_preview

router = APIRouter()
settings = get_settings()


class AdminLoginRequest(BaseModel):
    password: str


class SystemConfigResponse(BaseModel):
    llm_provider: str
    llm_model: str
    llm_base_url: str
    embedding_provider: str
    embedding_model: str
    ollama_enabled: bool


async def legacy_admin_login(req: AdminLoginRequest):
    if req.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="密码错误")
    token = create_access_token({"sub": "admin", "role": "admin"})
    return {"success": True, "token": token}


@router.get("/config")
async def get_system_config(user=Depends(get_current_admin)):
    return SystemConfigResponse(
        llm_provider=settings.llm_provider,
        llm_model=settings.llm_model,
        llm_base_url=settings.llm_base_url,
        embedding_provider=settings.embedding_provider,
        embedding_model=settings.embedding_model,
        ollama_enabled=settings.ollama_enabled,
    )


@router.post("/test-connection")
async def admin_test_connection(user=Depends(get_current_admin)):
    return await test_connection()


@router.get("/knowledge/stats")
async def knowledge_stats(user=Depends(get_current_admin)):
    return get_legacy_stats()


@router.get("/knowledge/preview")
async def knowledge_preview(
    limit: int = Query(default=80, ge=1, le=300),
    user=Depends(get_current_admin),
):
    return get_legacy_preview(limit)


@router.get("/system/health")
async def system_health(user=Depends(get_current_admin)):
    return {
        "status": "ok",
        "version": "2.0.0",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
    }
