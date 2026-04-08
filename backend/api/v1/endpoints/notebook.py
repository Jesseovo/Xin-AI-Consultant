"""笔记本 API"""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.deps import get_current_user, get_db
from backend.models.notebook import Notebook
from backend.services import notebook_service

logger = logging.getLogger("xin-ai.api.notebook")

router = APIRouter()


class NotebookCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    color: str = "#3B82F6"


class NotebookRecordCreateRequest(BaseModel):
    title: str | None = None
    content: str = Field(..., min_length=1)
    source_type: str | None = None
    source_id: int | None = None
    tags: list[str] | None = None


def _record_dict(r) -> dict:
    tags = r.tags
    tag_list = None
    if isinstance(tags, dict) and "items" in tags:
        tag_list = tags["items"]
    return {
        "id": r.id,
        "notebook_id": r.notebook_id,
        "title": r.title,
        "content": r.content,
        "source_type": r.source_type,
        "source_id": r.source_id,
        "tags": tag_list,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("/")
async def list_notebooks(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await notebook_service.list_notebooks(user.id, db)
    return [
        {
            "id": n.id,
            "name": n.name,
            "description": n.description,
            "color": n.color,
            "record_count": n.record_count,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in rows
    ]


@router.post("/")
async def create_notebook_endpoint(
    req: NotebookCreateRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        nb = await notebook_service.create_notebook(
            user.id,
            req.name,
            req.description,
            req.color,
            db,
        )
    except Exception as e:
        logger.error("创建笔记本失败: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="创建失败，请稍后重试。") from e

    return {
        "id": nb.id,
        "name": nb.name,
        "message": "笔记本创建成功。",
    }


async def _get_owned_notebook(notebook_id: int, user_id: int, db: AsyncSession) -> Notebook:
    result = await db.execute(
        select(Notebook).where(Notebook.id == notebook_id, Notebook.user_id == user_id)
    )
    nb = result.scalar_one_or_none()
    if not nb:
        raise HTTPException(status_code=404, detail="笔记本不存在或无权访问")
    return nb


@router.get("/{notebook_id}/records")
async def list_records_endpoint(
    notebook_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_notebook(notebook_id, user.id, db)
    rows = await notebook_service.list_records(notebook_id, db)
    return {"records": [_record_dict(r) for r in rows]}


@router.post("/{notebook_id}/records")
async def add_record_endpoint(
    notebook_id: int,
    req: NotebookRecordCreateRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_notebook(notebook_id, user.id, db)
    try:
        rec = await notebook_service.add_record(
            notebook_id,
            req.title.strip() if req.title else None,
            req.content,
            req.source_type,
            req.source_id,
            req.tags,
            db,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="笔记本不存在") from None
    except Exception as e:
        logger.error("添加记录失败: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="添加记录失败，请稍后重试。") from e

    return {"id": rec.id, "message": "记录已保存。"}


@router.delete("/{notebook_id}")
async def delete_notebook_endpoint(
    notebook_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await notebook_service.delete_notebook(notebook_id, user.id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="笔记本不存在或无权删除") from None
    except Exception as e:
        logger.error("删除笔记本失败: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="删除失败，请稍后重试。") from e
    return {"message": "笔记本已删除。"}


@router.delete("/{notebook_id}/records/{record_id}")
async def delete_record_endpoint(
    notebook_id: int,
    record_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_notebook(notebook_id, user.id, db)
    try:
        await notebook_service.delete_record(record_id, notebook_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="记录不存在") from None
    except Exception as e:
        logger.error("删除记录失败: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="删除失败，请稍后重试。") from e
    return {"message": "记录已删除。"}
