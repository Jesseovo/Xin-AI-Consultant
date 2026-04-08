"""笔记本与记录 CRUD"""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.notebook import Notebook, NotebookRecord

logger = logging.getLogger("xin-ai.notebook")


async def create_notebook(
    user_id: int,
    name: str,
    description: str | None,
    color: str,
    db: AsyncSession,
) -> Notebook:
    nb = Notebook(
        user_id=user_id,
        name=name.strip(),
        description=description,
        color=color or "#3B82F6",
        record_count=0,
    )
    db.add(nb)
    await db.commit()
    await db.refresh(nb)
    return nb


async def list_notebooks(user_id: int, db: AsyncSession) -> list[Notebook]:
    result = await db.execute(
        select(Notebook).where(Notebook.user_id == user_id).order_by(Notebook.created_at.desc())
    )
    return list(result.scalars().all())


async def add_record(
    notebook_id: int,
    title: str | None,
    content: str,
    source_type: str | None,
    source_id: int | None,
    tags: list[str] | None,
    db: AsyncSession,
) -> NotebookRecord:
    result = await db.execute(select(Notebook).where(Notebook.id == notebook_id))
    nb = result.scalar_one_or_none()
    if not nb:
        raise ValueError("笔记本不存在")

    tag_payload = {"items": tags} if tags else None
    rec = NotebookRecord(
        notebook_id=notebook_id,
        title=title if title else None,
        content=content,
        source_type=source_type,
        source_id=source_id,
        tags=tag_payload,
    )
    db.add(rec)
    nb.record_count = (nb.record_count or 0) + 1
    await db.commit()
    await db.refresh(rec)
    return rec


async def list_records(notebook_id: int, db: AsyncSession) -> list[NotebookRecord]:
    result = await db.execute(
        select(NotebookRecord)
        .where(NotebookRecord.notebook_id == notebook_id)
        .order_by(NotebookRecord.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_record(record_id: int, notebook_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(NotebookRecord).where(
            NotebookRecord.id == record_id,
            NotebookRecord.notebook_id == notebook_id,
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise ValueError("记录不存在")

    nb_result = await db.execute(select(Notebook).where(Notebook.id == notebook_id))
    nb = nb_result.scalar_one_or_none()

    await db.delete(rec)
    if nb and (nb.record_count or 0) > 0:
        nb.record_count = nb.record_count - 1
    await db.commit()


async def delete_notebook(notebook_id: int, user_id: int, db: AsyncSession) -> None:
    result = await db.execute(
        select(Notebook).where(Notebook.id == notebook_id, Notebook.user_id == user_id)
    )
    nb = result.scalar_one_or_none()
    if not nb:
        raise ValueError("笔记本不存在或无权删除")

    await db.delete(nb)
    await db.commit()
