"""Redis 连接管理 - Redis 不可用时自动降级为空操作"""
import logging

logger = logging.getLogger("xin-ai.redis")

redis_client = None

try:
    import redis.asyncio as aioredis
    from backend.app.config import get_settings

    settings = get_settings()
    _client = aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
        max_connections=50,
        socket_connect_timeout=3,
    )
    redis_client = _client
except Exception as e:
    logger.warning("Redis 模块加载失败，缓存功能将不可用: %s", e)


class _NoopRedis:
    """Redis 不可用时的空操作替代"""
    async def get(self, *a, **kw): return None
    async def set(self, *a, **kw): pass
    async def setex(self, *a, **kw): pass
    async def delete(self, *a, **kw): pass
    async def scan(self, cursor=0, **kw): return (0, [])
    async def ping(self): return True
    async def close(self): pass


async def get_redis():
    global redis_client
    if redis_client is None:
        redis_client = _NoopRedis()
    return redis_client


def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = _NoopRedis()
    return redis_client
