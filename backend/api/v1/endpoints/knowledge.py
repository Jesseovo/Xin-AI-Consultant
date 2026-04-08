"""知识库端点"""
import shutil

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.deps import get_current_user, get_current_teacher, get_db
from backend.models.knowledge_base import Document, KnowledgeBase
from backend.schemas.knowledge import KBCreateRequest
from backend.services import knowledge_service
from backend.services.knowledge_service import FILES_ROOT
from backend.services.rag_pipeline import hybrid_search

router = APIRouter()


@router.get("/")
async def list_knowledge_bases(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.owner_id == user.id).order_by(KnowledgeBase.created_at.desc())
    )
    kbs = result.scalars().all()
    return [
        {
            "id": kb.id,
            "name": kb.name,
            "description": kb.description,
            "kb_type": kb.kb_type,
            "doc_count": kb.doc_count,
            "chunk_count": kb.chunk_count,
            "created_at": kb.created_at.isoformat() if kb.created_at else None,
        }
        for kb in kbs
    ]


@router.post("/")
async def create_knowledge_base(
    req: KBCreateRequest,
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    kb = KnowledgeBase(
        owner_id=user.id,
        name=req.name,
        description=req.description,
        kb_type=req.kb_type,
        vector_collection=f"kb_{user.id}_{req.name.replace(' ', '_')[:30]}",
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return {"id": kb.id, "name": kb.name, "message": "知识库创建成功"}


@router.get("/{kb_id}/documents")
async def list_documents(
    kb_id: int,
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id, KnowledgeBase.owner_id == user.id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    dr = await db.execute(select(Document).where(Document.kb_id == kb_id).order_by(Document.created_at.desc()))
    docs = dr.scalars().all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "chunk_count": d.chunk_count,
            "status": d.status,
            "error_message": d.error_message,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.get("/{kb_id}/search")
async def search_knowledge_base(
    kb_id: int,
    query: str = Query(..., min_length=1, description="检索语句"),
    top_k: int = Query(5, ge=1, le=50),
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id, KnowledgeBase.owner_id == user.id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    hits = await hybrid_search(query.strip(), kb_ids=[kb_id], top_k=top_k)
    return {"query": query, "kb_id": kb_id, "results": hits}


@router.post("/{kb_id}/upload")
async def upload_document(
    kb_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id, KnowledgeBase.owner_id == user.id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="文件为空")
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件过大，请控制在 50MB 内")

    doc = Document(
        kb_id=kb.id,
        filename=file.filename,
        file_type=file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "unknown",
        file_size=len(content),
        status="pending",
    )
    db.add(doc)
    kb.doc_count = (kb.doc_count or 0) + 1
    await db.commit()
    await db.refresh(doc)

    FILES_ROOT.mkdir(parents=True, exist_ok=True)
    (FILES_ROOT / str(kb.id)).mkdir(parents=True, exist_ok=True)
    dest = knowledge_service.doc_storage_path(kb.id, doc.id, file.filename)
    try:
        dest.write_bytes(content)
    except OSError as e:
        raise HTTPException(status_code=500, detail=f"保存文件失败: {e}") from e

    background_tasks.add_task(
        knowledge_service.process_document,
        kb.id,
        doc.id,
        file.filename,
        content,
    )

    return {
        "doc_id": doc.id,
        "filename": file.filename,
        "status": "pending",
        "message": "文件已上传，正在处理",
    }


@router.delete("/{kb_id}")
async def delete_knowledge_base(
    kb_id: int,
    user=Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id, KnowledgeBase.owner_id == user.id))
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="知识库不存在")

    coll = kb.vector_collection
    await knowledge_service.delete_kb_vectors(coll)
    knowledge_service.clear_kb_tfidf_cache(kb_id)
    kb_dir = FILES_ROOT / str(kb_id)
    if kb_dir.is_dir():
        shutil.rmtree(kb_dir, ignore_errors=True)

    await db.delete(kb)
    await db.commit()
    return {"message": "知识库已删除"}
