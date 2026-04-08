"""混合检索：向量 + TF-IDF，带 Redis 缓存"""
import hashlib
import logging
from typing import Any

from backend.core.cache import get_cached, set_cached
from backend.db.mysql import async_session
from backend.models.knowledge_base import KnowledgeBase
from backend.services import embedding_service, vector_store
from backend.services.knowledge_service import search_legacy, tfidf_score_for_chunk_id

logger = logging.getLogger("xin-ai.rag")

RAG_CACHE_PREFIX = "chat:rag"
RAG_CACHE_TTL = 600


def _cache_key_part(query: str, kb_ids: list[int] | None, top_k: int, alpha: float) -> str:
    qh = hashlib.md5(query.encode("utf-8")).hexdigest()
    if kb_ids is None:
        kb_part = "none"
    else:
        kb_part = ",".join(str(x) for x in sorted(kb_ids))
    return f"{qh}:{kb_part}:k{top_k}:a{alpha:.4f}"


def _min_max_norm(values: list[float]) -> list[float]:
    if not values:
        return []
    lo, hi = min(values), max(values)
    if hi - lo < 1e-9:
        return [1.0] * len(values)
    return [(v - lo) / (hi - lo) for v in values]


async def _resolve_kb_collections(kb_ids: list[int]) -> list[tuple[int, str]]:
    if not kb_ids:
        return []
    async with async_session() as db:
        from sqlalchemy import select

        result = await db.execute(select(KnowledgeBase).where(KnowledgeBase.id.in_(kb_ids)))
        rows = result.scalars().all()
    out: list[tuple[int, str]] = []
    for kb in rows:
        if kb.vector_collection:
            out.append((kb.id, kb.vector_collection))
    return out


async def hybrid_search(
    query: str,
    kb_ids: list[int] | None = None,
    top_k: int = 5,
    alpha: float = 0.7,
) -> list[dict[str, Any]]:
    if not query or not query.strip():
        return []

    ck = _cache_key_part(query.strip(), kb_ids, top_k, alpha)
    cached = await get_cached(RAG_CACHE_PREFIX, ck)
    if cached and isinstance(cached.get("results"), list):
        return cached["results"]

    legacy_hits = search_legacy(query, top_k=max(top_k * 2, top_k))

    if kb_ids is None:
        out = []
        for item in legacy_hits[:top_k]:
            out.append({
                "text": f"{item['question']}\n{item['answer']}",
                "source": "legacy_qa",
                "score": round(float(item.get("score", 0.0)), 6),
                "metadata": {"type": "legacy_qa"},
            })
        await set_cached(RAG_CACHE_PREFIX, ck, {"results": out}, ttl=RAG_CACHE_TTL)
        return out

    pairs = await _resolve_kb_collections(kb_ids)
    has_any_vector = bool(pairs) and any(
        vector_store.collection_exists(cn) and vector_store.count_documents(cn) > 0
        for _, cn in pairs
    )

    if not has_any_vector:
        out = []
        for item in legacy_hits[:top_k]:
            out.append({
                "text": f"{item['question']}\n{item['answer']}",
                "source": "legacy_qa",
                "score": round(float(item.get("score", 0.0)), 6),
                "metadata": {"type": "legacy_qa"},
            })
        await set_cached(RAG_CACHE_PREFIX, ck, {"results": out}, ttl=RAG_CACHE_TTL)
        return out

    try:
        q_emb = await embedding_service.embed_query(query.strip())
    except Exception as e:
        logger.warning("hybrid_search 嵌入失败，仅返回 legacy: %s", e)
        q_emb = []

    candidates: list[dict[str, Any]] = []
    seen_chunk_ids: set[str] = set()

    if q_emb:
        for kb_id, coll in pairs:
            if not vector_store.collection_exists(coll) or vector_store.count_documents(coll) == 0:
                continue
            hits = vector_store.search(coll, q_emb, top_k=max(top_k * 2, top_k))
            for h in hits:
                cid = str(h.get("id") or "")
                if cid in seen_chunk_ids:
                    continue
                seen_chunk_ids.add(cid)
                raw_v = float(h.get("score", 0.0))
                raw_t = tfidf_score_for_chunk_id(kb_id, coll, cid, query.strip())
                meta = dict(h.get("metadata") or {})
                meta.setdefault("kb_id", kb_id)
                meta["chunk_id"] = cid
                candidates.append({
                    "text": h.get("text") or "",
                    "source": meta.get("filename") or coll,
                    "raw_v": raw_v,
                    "raw_t": raw_t,
                    "metadata": meta,
                })

    for item in legacy_hits:
        candidates.append({
            "text": f"{item['question']}\n{item['answer']}",
            "source": "legacy_qa",
            "raw_v": 0.0,
            "raw_t": float(item.get("score", 0.0)),
            "metadata": {"type": "legacy_qa"},
        })

    if not candidates:
        await set_cached(RAG_CACHE_PREFIX, ck, {"results": []}, ttl=RAG_CACHE_TTL)
        return []

    nv = _min_max_norm([c["raw_v"] for c in candidates])
    nt = _min_max_norm([c["raw_t"] for c in candidates])

    scored: list[dict[str, Any]] = []
    for i, c in enumerate(candidates):
        final = alpha * nv[i] + (1.0 - alpha) * nt[i]
        scored.append({
            "text": c["text"],
            "source": str(c["source"]),
            "score": round(float(final), 6),
            "metadata": c["metadata"],
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    out = scored[:top_k]
    await set_cached(RAG_CACHE_PREFIX, ck, {"results": out}, ttl=RAG_CACHE_TTL)
    return out
