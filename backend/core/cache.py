"""Redis 缓存工具 - Redis 不可用时静默降级"""
import hashlib
import json
import logging

logger = logging.getLogger("xin-ai.cache")


def _get_client():
    from backend.db.redis import get_redis_client
    return get_redis_client()


def make_cache_key(*parts: str) -> str:
    raw = ":".join(str(p) for p in parts)
    return hashlib.md5(raw.encode()).hexdigest()


async def get_cached(prefix: str, key: str) -> dict | None:
    try:
        data = await _get_client().get(f"{prefix}:{key}")
        if data:
            return json.loads(data)
    except Exception as e:
        logger.debug("缓存读取失败: %s", e)
    return None


async def set_cached(prefix: str, key: str, value: dict, ttl: int = 1800) -> None:
    try:
        await _get_client().setex(f"{prefix}:{key}", ttl, json.dumps(value, ensure_ascii=False))
    except Exception as e:
        logger.debug("缓存写入失败: %s", e)


async def delete_cached(prefix: str, key: str) -> None:
    try:
        await _get_client().delete(f"{prefix}:{key}")
    except Exception:
        pass


async def clear_prefix(prefix: str) -> None:
    try:
        cursor = 0
        while True:
            cursor, keys = await _get_client().scan(cursor, match=f"{prefix}:*", count=100)
            if keys:
                await _get_client().delete(*keys)
            if cursor == 0:
                break
    except Exception as e:
        logger.debug("缓存清理失败: %s", e)
