"""V1 API 路由汇总"""
from fastapi import APIRouter

from backend.api.v1.endpoints import (
    admin,
    auth,
    chat,
    cowriter,
    guided,
    knowledge,
    notebook,
    quiz,
    research,
    tutorbot,
)

api_v1_router = APIRouter()

api_v1_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_v1_router.include_router(chat.router, prefix="/chat", tags=["对话"])
api_v1_router.include_router(admin.router, prefix="/admin", tags=["管理"])
api_v1_router.include_router(knowledge.router, prefix="/knowledge", tags=["知识库"])
api_v1_router.include_router(tutorbot.router, prefix="/bots", tags=["TutorBot"])
api_v1_router.include_router(quiz.router, prefix="/quiz", tags=["测验"])
api_v1_router.include_router(notebook.router, prefix="/notebook", tags=["笔记本"])
api_v1_router.include_router(guided.router, prefix="/guided", tags=["引导学习"])
api_v1_router.include_router(research.router, prefix="/research", tags=["深度调研"])
api_v1_router.include_router(cowriter.router, prefix="/cowriter", tags=["协同写作"])
