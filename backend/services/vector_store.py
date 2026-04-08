"""ChromaDB 向量存储"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

logger = logging.getLogger("xin-ai.vector_store")

_CHROMA_PATH = Path(__file__).resolve().parents[2] / "data" / "knowledge_bases" / "chroma"
_client: Optional[chromadb.PersistentClient] = None


def _get_client() -> chromadb.PersistentClient:
    global _client
    if _client is None:
        _CHROMA_PATH.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=str(_CHROMA_PATH),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _client


def create_collection(name: str):
    if not name or not str(name).strip():
        raise ValueError("collection name 不能为空")
    client = _get_client()
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


def collection_exists(name: str) -> bool:
    if not name:
        return False
    try:
        client = _get_client()
        cols = client.list_collections()
        return any(c.name == name for c in cols)
    except Exception as e:
        logger.debug("collection_exists: %s", e)
        return False


def add_documents(
    collection_name: str,
    texts: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
    ids: list[str],
) -> None:
    if not (len(texts) == len(embeddings) == len(metadatas) == len(ids)):
        raise ValueError("texts、embeddings、metadatas、ids 长度必须一致")
    if not texts:
        return
    col = create_collection(collection_name)
    meta_serialized: list[dict] = []
    for m in metadatas:
        clean = {}
        for k, v in m.items():
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                clean[k] = v
            else:
                clean[k] = str(v)
        meta_serialized.append(clean)
    col.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=meta_serialized,
    )


def search(
    collection_name: str,
    query_embedding: list[float],
    top_k: int = 5,
) -> list[dict]:
    if not collection_exists(collection_name):
        return []
    col = _get_client().get_collection(name=collection_name)
    try:
        raw = col.query(
            query_embeddings=[query_embedding],
            n_results=max(1, top_k),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        logger.warning("Chroma query 失败 %s: %s", collection_name, e)
        return []

    ids_list = raw.get("ids") or [[]]
    docs_list = raw.get("documents") or [[]]
    meta_list = raw.get("metadatas") or [[]]
    dist_list = raw.get("distances") or [[]]

    ids = ids_list[0] if ids_list else []
    docs = docs_list[0] if docs_list else []
    metas = meta_list[0] if meta_list else []
    dists = dist_list[0] if dist_list else []

    results: list[dict] = []
    for i, cid in enumerate(ids):
        text = docs[i] if i < len(docs) else ""
        meta = metas[i] if i < len(metas) else {}
        d = float(dists[i]) if i < len(dists) else 1.0
        score = max(0.0, min(1.0, 1.0 - d))
        results.append({
            "text": text or "",
            "metadata": dict(meta) if meta else {},
            "score": score,
            "id": cid,
        })
    return results


def delete_collection(name: str) -> None:
    if not name:
        return
    try:
        client = _get_client()
        client.delete_collection(name=name)
    except Exception as e:
        logger.warning("delete_collection %s: %s", name, e)


def delete_document_chunks(collection_name: str, id_prefix: str) -> None:
    if not collection_exists(collection_name) or not id_prefix:
        return
    col = _get_client().get_collection(name=collection_name)
    try:
        existing = col.get(include=[])
        all_ids = existing.get("ids") or []
        to_del = [i for i in all_ids if i.startswith(id_prefix)]
        if to_del:
            col.delete(ids=to_del)
    except Exception as e:
        logger.warning("delete_document_chunks: %s", e)


def fetch_all_for_index(collection_name: str) -> tuple[list[str], list[str], list[dict]]:
    if not collection_exists(collection_name):
        return [], [], []
    col = _get_client().get_collection(name=collection_name)
    try:
        raw = col.get(include=["documents", "metadatas"])
    except Exception as e:
        logger.warning("fetch_all_for_index: %s", e)
        return [], [], []
    ids = raw.get("ids") or []
    docs = raw.get("documents") or []
    metas = raw.get("metadatas") or []
    return list(ids), list(docs), [dict(m) if m else {} for m in metas]


def count_documents(collection_name: str) -> int:
    if not collection_exists(collection_name):
        return 0
    try:
        col = _get_client().get_collection(name=collection_name)
        return col.count()
    except Exception:
        return 0
