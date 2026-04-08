"""TutorBot 相关 Schema"""
from pydantic import BaseModel


class BotCreateRequest(BaseModel):
    name: str
    description: str | None = None
    subject_tags: list[str] | None = None
    persona: str | None = None
    teaching_style: str | None = None
    system_prompt: str | None = None
    is_public: bool = True
    kb_ids: list[int] | None = None


class BotUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    subject_tags: list[str] | None = None
    persona: str | None = None
    teaching_style: str | None = None
    system_prompt: str | None = None
    is_public: bool | None = None
    kb_ids: list[int] | None = None


class BotResponse(BaseModel):
    id: int
    teacher_id: int
    name: str
    avatar_url: str | None
    description: str | None
    subject_tags: list[str] | None
    persona: str | None
    teaching_style: str | None
    is_public: bool
    usage_count: int
    teacher_name: str | None = None

    class Config:
        from_attributes = True
