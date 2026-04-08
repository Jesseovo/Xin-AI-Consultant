"""FastAPI 应用入口"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import get_settings
from backend.db.mysql import engine, Base

logger = logging.getLogger("xin-ai")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s: %(message)s")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("夹心 启动中...")
    logger.info("数据库后端: %s", settings.db_backend)

    async with engine.begin() as conn:
        from backend.models import (
            user, tutorbot, knowledge_base, session as sess_model,
            memory, notebook, quiz,
        )
        await conn.run_sync(Base.metadata.create_all)
    logger.info("数据库表初始化完成")

    # Redis（可选）
    try:
        from backend.db.redis import redis_client
        if redis_client is not None:
            await redis_client.ping()
            logger.info("Redis 连接成功")
        else:
            logger.info("Redis 未配置，使用无缓存模式")
    except Exception as e:
        logger.warning("Redis 连接失败（缓存功能将不可用）: %s", e)

    # 旧版知识库兼容
    try:
        from backend.services.knowledge_service import load_legacy_knowledge
        await load_legacy_knowledge()
    except Exception as e:
        logger.warning("旧版知识库加载跳过: %s", e)

    yield

    await engine.dispose()
    try:
        from backend.db.redis import redis_client
        if redis_client is not None:
            await redis_client.close()
    except Exception:
        pass
    logger.info("夹心 已关闭")


app = FastAPI(
    title="夹心",
    description="夹心智能教学平台 API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.v1.router import api_v1_router
app.include_router(api_v1_router, prefix="/api/v1")

from backend.api.v1.endpoints import chat as chat_ep, admin as admin_ep


@app.post("/api/chat")
async def legacy_chat(req: chat_ep.LegacyChatRequest):
    """旧版对话：无用户认证，仅兼容早期前端；生产环境建议改用 /api/v1/chat。"""
    return await chat_ep.legacy_chat(req)


@app.post("/api/chat/stream")
async def legacy_chat_stream(req: chat_ep.LegacyChatRequest):
    """旧版流式对话：无用户认证，仅兼容早期前端。"""
    return await chat_ep.legacy_chat_stream(req)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "message": "夹心智能教学平台运行中"}


@app.post("/api/admin/login")
async def legacy_admin_login(req: admin_ep.AdminLoginRequest):
    """管理员口令校验后签发 JWT；管理接口请携带 Authorization: Bearer <token>。"""
    return await admin_ep.legacy_admin_login(req)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=settings.backend_port, reload=True)
