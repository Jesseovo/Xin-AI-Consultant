"""TutorBot 模型"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.mysql import Base


class TutorBot(Base):
    __tablename__ = "tutorbots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    teacher_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    subject_tags: Mapped[dict | None] = mapped_column(JSON)
    persona: Mapped[str | None] = mapped_column(Text)
    teaching_style: Mapped[str | None] = mapped_column(String(50))
    system_prompt: Mapped[str | None] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    teacher = relationship("User", back_populates="tutorbots")
    knowledge_links = relationship("TutorBotKnowledge", back_populates="bot", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="bot", lazy="selectin")


class TutorBotKnowledge(Base):
    __tablename__ = "tutorbot_knowledge"

    bot_id: Mapped[int] = mapped_column(Integer, ForeignKey("tutorbots.id", ondelete="CASCADE"), primary_key=True)
    kb_id: Mapped[int] = mapped_column(Integer, ForeignKey("knowledge_bases.id", ondelete="CASCADE"), primary_key=True)

    bot = relationship("TutorBot", back_populates="knowledge_links")
    knowledge_base = relationship("KnowledgeBase")
