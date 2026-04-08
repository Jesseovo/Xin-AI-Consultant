"""Embedding 服务：本地 sentence-transformers / OpenAI 兼容 API"""
import asyncio
import logging
from typing import Any

import httpx

from backend.app.config import get_settings

logger = logging.getLogger("xin-ai.embedding")

_local_model: Any = None
_model_lock = asyncio.Lock()


async def _load_local_model():
    global _local_model
    async with _model_lock:
        if _local_model is None:
            from sentence_transformers import SentenceTransformer

            settings = get_settings()
            logger.info("加载本地 Embedding 模型: %s", settings.embedding_model)
            _local_model = await asyncio.to_thread(SentenceTransformer, settings.embedding_model)
    return _local_model


def _embedding_api_url(base: str) -> str:
    b = (base or "").strip().rstrip("/")
    if not b:
        return "https://api.openai.com/v1/embeddings"
    if b.endswith("/embeddings"):
        return b
    return f"{b}/embeddings"


async def _embed_via_http(texts: list[str], settings) -> list[list[float]]:
    url = _embedding_api_url(settings.embedding_base_url)
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.embedding_api_key:
        headers["Authorization"] = f"Bearer {settings.embedding_api_key}"
    model = settings.embedding_model or "text-embedding-3-small"
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            url,
            headers=headers,
            json={"model": model, "input": texts},
        )
        resp.raise_for_status()
        data = resp.json()
    items = sorted(data.get("data", []), key=lambda x: x.get("index", 0))
    out = [item["embedding"] for item in items]
    if len(out) != len(texts):
        raise RuntimeError("Embedding API 返回数量与输入不一致")
    return out


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    settings = get_settings()
    provider = settings.embedding_provider.lower().strip()

    try:
        if provider == "local":
            model = await _load_local_model()
            emb = await asyncio.to_thread(
                model.encode,
                texts,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            return emb.tolist()

        if provider in ("openai", "deepseek", "siliconflow"):
            return await _embed_via_http(texts, settings)

        logger.warning("未知 embedding_provider=%s，回退到 local", provider)
        model = await _load_local_model()
        emb = await asyncio.to_thread(
            model.encode,
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return emb.tolist()
    except Exception as e:
        logger.exception("embed_texts 失败: %s", e)
        raise


async def embed_query(query: str) -> list[float]:
    vecs = await embed_texts([query])
    return vecs[0] if vecs else []
