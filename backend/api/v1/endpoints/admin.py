"""管理员端点"""
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend.app.config import get_settings
from backend.app.deps import get_current_admin
from backend.core.security import create_access_token
from backend.services.llm_router import test_connection
from backend.services.knowledge_service import get_legacy_stats, get_legacy_preview

router = APIRouter()
settings = get_settings()

_UI_CONFIG_PATH = Path(__file__).resolve().parents[3] / "data" / "admin_ui_config.json"

_DEFAULT_UI_CONFIG: dict = {
    "site": {
        "platformName": "智学助手",
        "description": "面向高校师生的 AI 学习与教学平台。",
    },
    "rateLimit": {"requestsPerMinute": 120, "maxTokensPerRequest": 8192},
    "security": {"registrationOpen": True, "emailVerification": False},
    "session": {
        "sessionTimeoutMinutes": 60,
        "maxConcurrentSessionsPerUser": 3,
        "maxMessageLength": 32000,
    },
    "storage": {
        "maxUploadMb": 50,
        "allowedFileTypes": {
            "pdf": True,
            "docx": True,
            "txt": True,
            "md": True,
            "xlsx": True,
        },
        "vectorDbType": "chromadb",
    },
}


def _deep_merge(base: dict, override: dict) -> dict:
    out = {**base}
    for k, v in override.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def _load_ui_config() -> dict:
    if not _UI_CONFIG_PATH.is_file():
        return {}
    try:
        with open(_UI_CONFIG_PATH, encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _save_ui_config(cfg: dict) -> None:
    _UI_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(_UI_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


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
    base = SystemConfigResponse(
        llm_provider=settings.llm_provider,
        llm_model=settings.llm_model,
        llm_base_url=settings.llm_base_url,
        embedding_provider=settings.embedding_provider,
        embedding_model=settings.embedding_model,
        ollama_enabled=settings.ollama_enabled,
    ).model_dump()
    ui = _deep_merge(_DEFAULT_UI_CONFIG, _load_ui_config())
    return {**base, **ui}


class UIConfigUpdate(BaseModel):
    site: Optional[dict] = None
    rateLimit: Optional[dict] = None
    security: Optional[dict] = None
    session: Optional[dict] = None
    storage: Optional[dict] = None


@router.post("/config")
async def post_system_config(
    body: UIConfigUpdate,
    user=Depends(get_current_admin),
):
    patch = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    merged_ui = _deep_merge(_DEFAULT_UI_CONFIG, _load_ui_config())
    merged_ui = _deep_merge(merged_ui, patch)
    _save_ui_config(merged_ui)
    return await get_system_config(user)


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
