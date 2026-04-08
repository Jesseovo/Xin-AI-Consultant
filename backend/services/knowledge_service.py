"""知识库服务 - 兼容旧版 + 新版 RAG"""
import asyncio
import json
import logging
import os
import re
from pathlib import Path

import jieba
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import select

logger = logging.getLogger("xin-ai.knowledge")

LEGACY_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "qa_knowledge.json")
FILES_ROOT = Path(__file__).resolve().parents[2] / "data" / "knowledge_bases" / "files"

_kb_tfidf: dict[int, dict] = {}

_qa_data: list[dict] = []
_vectorizer: TfidfVectorizer | None = None
_tfidf_matrix = None
_question_tokens: list[set[str]] = []

_STOPWORDS = frozenset(
    "的 了 在 是 我 有 和 就 不 人 都 一 一个 上 也 很 到 说 要 去 你 会 着 没有 看 好 自己 这".split()
)


def _tokenize(text: str) -> str:
    return " ".join(w for w in jieba.cut(text) if w.strip() and w not in _STOPWORDS)


def _keyword_set(text: str) -> set[str]:
    return {w for w in jieba.cut(text) if len(w) >= 2 and w not in _STOPWORDS}


async def load_legacy_knowledge():
    """加载旧版 JSON 知识库（兼容原系统）"""
    global _qa_data, _vectorizer, _tfidf_matrix, _question_tokens

    if not os.path.exists(LEGACY_DATA_PATH):
        logger.info("旧版知识库文件不存在，跳过加载")
        return

    with open(LEGACY_DATA_PATH, "r", encoding="utf-8") as f:
        _qa_data = json.load(f)

    if not _qa_data:
        _vectorizer = TfidfVectorizer()
        _tfidf_matrix = _vectorizer.fit_transform([""])
        _question_tokens = [set()]
        logger.info("知识库为空")
        return

    questions_tokenized = [_tokenize(item["question"]) for item in _qa_data]
    _question_tokens = [_keyword_set(item["question"]) for item in _qa_data]

    _vectorizer = TfidfVectorizer()
    _tfidf_matrix = _vectorizer.fit_transform(questions_tokenized)
    logger.info("旧版知识库加载完成: %d 条问答对", len(_qa_data))


def search_legacy(query: str, top_k: int = 3) -> list[dict]:
    """旧版 TF-IDF + 关键词混合检索"""
    if _vectorizer is None or _tfidf_matrix is None:
        return []

    query_tokens = _keyword_set(query)
    query_tokenized = _tokenize(query)

    query_vec = _vectorizer.transform([query_tokenized])
    tfidf_scores = cosine_similarity(query_vec, _tfidf_matrix).flatten()

    keyword_scores = []
    for qt in _question_tokens:
        if not qt or not query_tokens:
            keyword_scores.append(0.0)
            continue
        overlap = len(query_tokens & qt)
        keyword_scores.append(overlap / max(len(query_tokens), len(qt)))

    combined = []
    for i in range(len(_qa_data)):
        score = 0.7 * tfidf_scores[i] + 0.3 * keyword_scores[i]
        if score > 0:
            combined.append((i, round(score, 4)))

    combined.sort(key=lambda x: x[1], reverse=True)

    results = []
    for idx, score in combined[:top_k]:
        results.append({
            "question": _qa_data[idx]["question"],
            "answer": _qa_data[idx]["answer"],
            "score": score,
        })
    return results


def get_legacy_stats() -> dict:
    return {"count": len(_qa_data)}


def get_legacy_preview(limit: int = 80) -> dict:
    safe_limit = max(1, min(int(limit), 300))
    items = []
    for item in _qa_data[:safe_limit]:
        answer = str(item.get("answer", "")).strip()
        short_answer = answer if len(answer) <= 120 else (answer[:120] + "...")
        items.append({
            "id": item.get("id"),
            "question": str(item.get("question", "")).strip(),
            "answer": short_answer,
        })
    return {"count": len(_qa_data), "items": items}


def _safe_storage_filename(filename: str) -> str:
    base = os.path.basename(filename)
    return re.sub(r"[^\w\-. \u4e00-\u9fff]", "_", base)[:180]


def doc_storage_path(kb_id: int, doc_id: int, filename: str) -> Path:
    return FILES_ROOT / str(kb_id) / f"{doc_id}_{_safe_storage_filename(filename)}"


def refresh_kb_tfidf_index(kb_id: int, collection_name: str) -> None:
    from backend.services import vector_store

    ids, texts, metas = vector_store.fetch_all_for_index(collection_name)
    if not texts:
        _kb_tfidf.pop(kb_id, None)
        return
    tokenized = [_tokenize(t) for t in texts]
    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(tokenized)
    _kb_tfidf[kb_id] = {
        "vectorizer": vectorizer,
        "matrix": matrix,
        "ids": list(ids),
        "texts": list(texts),
        "metadatas": list(metas),
    }


def clear_kb_tfidf_cache(kb_id: int) -> None:
    _kb_tfidf.pop(kb_id, None)


def tfidf_score_for_chunk_id(
    kb_id: int,
    collection_name: str,
    chunk_id: str,
    query: str,
) -> float:
    from backend.services import vector_store

    if not chunk_id or not query.strip():
        return 0.0
    if kb_id not in _kb_tfidf and vector_store.count_documents(collection_name) > 0:
        refresh_kb_tfidf_index(kb_id, collection_name)
    st = _kb_tfidf.get(kb_id)
    if not st:
        return 0.0
    try:
        idx = st["ids"].index(chunk_id)
    except ValueError:
        return 0.0
    qv = st["vectorizer"].transform([_tokenize(query)])
    row = st["matrix"][idx : idx + 1]
    sim = float(cosine_similarity(qv, row)[0][0])
    return max(0.0, min(1.0, sim))


async def delete_kb_vectors(collection_name: str | None) -> None:
    from backend.services import vector_store

    if not collection_name:
        return

    def _run():
        vector_store.delete_collection(collection_name)

    await asyncio.to_thread(_run)


async def process_document(kb_id: int, doc_id: int, filename: str, content: bytes) -> None:
    from backend.db.mysql import async_session
    from backend.models.knowledge_base import Document, KnowledgeBase
    from backend.services import document_parser, embedding_service, vector_store

    FILES_ROOT.mkdir(parents=True, exist_ok=True)
    (FILES_ROOT / str(kb_id)).mkdir(parents=True, exist_ok=True)

    coll: str | None = None
    async with async_session() as db:
        kb_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
        kb = kb_result.scalar_one_or_none()
        doc_result = await db.execute(select(Document).where(Document.id == doc_id, Document.kb_id == kb_id))
        doc = doc_result.scalar_one_or_none()
        if not kb or not doc or not kb.vector_collection:
            logger.warning("process_document 跳过: kb=%s doc=%s", kb_id, doc_id)
            return

        coll = kb.vector_collection
        doc.status = "processing"
        doc.error_message = None
        await db.commit()

    try:
        chunks = document_parser.parse_document(filename, content)
        if not chunks:
            raise ValueError("未解析到有效文本块")

        if not coll:
            return
        prefix = f"{kb_id}_{doc_id}_"
        await asyncio.to_thread(vector_store.delete_document_chunks, coll, prefix)

        texts = [c["text"] for c in chunks]
        batch_size = 32
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            emb = await embedding_service.embed_texts(batch)
            all_embeddings.extend(emb)

        ids = [f"{kb_id}_{doc_id}_{i}" for i in range(len(chunks))]
        metadatas = []
        for i, ch in enumerate(chunks):
            m = dict(ch["metadata"])
            m["kb_id"] = kb_id
            m["doc_id"] = doc_id
            m["chunk_index"] = i
            metadatas.append(m)

        await asyncio.to_thread(
            vector_store.add_documents,
            coll,
            texts,
            all_embeddings,
            metadatas,
            ids,
        )

        await asyncio.to_thread(refresh_kb_tfidf_index, kb_id, coll)

        async with async_session() as db:
            doc_result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = doc_result.scalar_one_or_none()
            kb_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
            kb = kb_result.scalar_one_or_none()
            if doc and kb:
                doc.status = "ready"
                doc.chunk_count = len(chunks)
                doc.error_message = None
                kb.chunk_count = await asyncio.to_thread(vector_store.count_documents, coll)
                await db.commit()
    except Exception as e:
        logger.exception("process_document 失败 kb=%s doc=%s: %s", kb_id, doc_id, e)
        async with async_session() as db:
            doc_result = await db.execute(select(Document).where(Document.id == doc_id))
            doc = doc_result.scalar_one_or_none()
            if doc:
                doc.status = "failed"
                doc.error_message = str(e)[:2000]
                await db.commit()


async def rebuild_kb_index(kb_id: int) -> None:
    from backend.db.mysql import async_session
    from backend.models.knowledge_base import Document, KnowledgeBase
    from backend.services import document_parser, embedding_service, vector_store

    async with async_session() as db:
        kb_result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
        kb = kb_result.scalar_one_or_none()
        if not kb or not kb.vector_collection:
            logger.warning("rebuild_kb_index: 知识库不存在或无 collection")
            return
        coll = kb.vector_collection
        docs_result = await db.execute(select(Document).where(Document.kb_id == kb_id).order_by(Document.id))
        documents = list(docs_result.scalars().all())

    await asyncio.to_thread(vector_store.delete_collection, coll)
    await asyncio.to_thread(vector_store.create_collection, coll)
    clear_kb_tfidf_cache(kb_id)

    all_texts: list[str] = []
    all_metas: list[dict] = []
    all_ids: list[str] = []
    doc_chunk_counts: dict[int, int] = {}
    doc_failed: dict[int, str] = {}

    for doc in documents:
        path = doc_storage_path(kb_id, doc.id, doc.filename)
        if not path.is_file():
            doc_failed[doc.id] = "本地文件缺失，无法重建索引"
            continue
        try:
            content = path.read_bytes()
            chunks = document_parser.parse_document(doc.filename, content)
        except Exception as e:
            logger.warning("rebuild 解析失败 doc=%s: %s", doc.id, e)
            doc_failed[doc.id] = str(e)[:500]
            continue

        if not chunks:
            doc_failed[doc.id] = "无有效文本块"
            continue

        doc_chunk_counts[doc.id] = len(chunks)
        for i, ch in enumerate(chunks):
            cid = f"{kb_id}_{doc.id}_{i}"
            all_ids.append(cid)
            all_texts.append(ch["text"])
            m = dict(ch["metadata"])
            m["kb_id"] = kb_id
            m["doc_id"] = doc.id
            m["chunk_index"] = i
            all_metas.append(m)

    if not all_texts:
        await asyncio.to_thread(refresh_kb_tfidf_index, kb_id, coll)
        async with async_session() as db:
            kb_row = await db.get(KnowledgeBase, kb_id)
            if kb_row:
                kb_row.chunk_count = 0
            for doc in documents:
                d = await db.get(Document, doc.id)
                if not d:
                    continue
                if doc.id in doc_failed:
                    d.status = "failed"
                    d.error_message = doc_failed[doc.id][:500]
                elif doc.id not in doc_chunk_counts:
                    d.status = "failed"
                    d.error_message = d.error_message or "未编入索引"
            await db.commit()
        return

    batch_size = 32
    all_embeddings: list[list[float]] = []
    for i in range(0, len(all_texts), batch_size):
        batch = all_texts[i : i + batch_size]
        emb = await embedding_service.embed_texts(batch)
        all_embeddings.extend(emb)

    await asyncio.to_thread(
        vector_store.add_documents,
        coll,
        all_texts,
        all_embeddings,
        all_metas,
        all_ids,
    )
    await asyncio.to_thread(refresh_kb_tfidf_index, kb_id, coll)

    async with async_session() as db:
        kb_row = await db.get(KnowledgeBase, kb_id)
        if kb_row:
            kb_row.chunk_count = await asyncio.to_thread(vector_store.count_documents, coll)
        for doc in documents:
            d = await db.get(Document, doc.id)
            if not d:
                continue
            if doc.id in doc_failed:
                d.status = "failed"
                d.error_message = doc_failed[doc.id][:500]
            elif doc.id in doc_chunk_counts:
                d.status = "ready"
                d.chunk_count = doc_chunk_counts[doc.id]
                d.error_message = None
        await db.commit()
