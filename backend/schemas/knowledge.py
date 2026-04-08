"""知识库相关 Schema"""
from pydantic import BaseModel


class KBCreateRequest(BaseModel):
    name: str
    description: str | None = None
    kb_type: str = "mixed"


class KBResponse(BaseModel):
    id: int
    name: str
    description: str | None
    kb_type: str
    doc_count: int
    chunk_count: int
    created_at: str

    class Config:
        from_attributes = True
