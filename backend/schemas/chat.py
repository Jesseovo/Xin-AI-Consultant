"""对话相关 Schema"""
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    session_id: int | None = None
    bot_id: int | None = None
    mode: str = "chat"
    kb_ids: list[int] | None = None
    tools: list[str] | None = None


class ChatResponse(BaseModel):
    answer: str
    session_id: int
    sources: list[dict] = []
    mode: str = "chat"
