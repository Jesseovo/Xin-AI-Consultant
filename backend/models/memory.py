"""学生记忆画像模型"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.mysql import Base


class MemoryProfile(Base):
    __tablename__ = "memory_profiles"
    __table_args__ = (UniqueConstraint("user_id", "bot_id", name="uk_user_bot"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    bot_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("tutorbots.id"))
    summary: Mapped[str | None] = mapped_column(Text)
    profile_data: Mapped[dict | None] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
