"""会话与消息、Redis 近期上下文缓存"""
import json
import logging

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.mysql import async_session
from backend.db.redis import get_redis_client
from backend.models.session import Message, Session

logger = logging.getLogger("xin-ai.session")

_CTX_KEY = "session:ctx:{}"
_CTX_TTL = 7200
_REDIS_CTX_CAP = 100


def _ctx_key(session_id: int) -> str:
    return _CTX_KEY.format(session_id)


async def _append_redis_ctx(session_id: int, role: str, content: str) -> None:
    key = _ctx_key(session_id)
    try:
        rc = get_redis_client()
        raw = await rc.get(key)
        msgs: list[dict] = json.loads(raw) if raw else []
        msgs.append({"role": role, "content": content})
        if len(msgs) > _REDIS_CTX_CAP:
            msgs = msgs[-_REDIS_CTX_CAP:]
        await rc.setex(key, _CTX_TTL, json.dumps(msgs, ensure_ascii=False))
    except Exception as e:
        logger.warning("更新会话 Redis 缓存失败: %s", e, exc_info=True)


async def create_session(
    user_id: int,
    bot_id: int | None,
    mode: str,
    db: AsyncSession,
    title: str | None = None,
) -> Session:
    sess = Session(
        user_id=user_id,
        bot_id=bot_id,
        mode=mode or "chat",
        title=title,
        is_active=True,
        message_count=0,
    )
    db.add(sess)
    await db.flush()
    return sess


async def get_session(session_id: int, user_id: int, db: AsyncSession) -> Session | None:
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def list_sessions(
    user_id: int,
    bot_id: int | None,
    limit: int,
    db: AsyncSession,
) -> list[Session]:
    stmt = select(Session).where(Session.user_id == user_id).order_by(Session.updated_at.desc())
    if bot_id is not None:
        stmt = stmt.where(Session.bot_id == bot_id)
    stmt = stmt.limit(max(1, min(limit, 200)))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def add_message(
    session_id: int,
    role: str,
    content: str,
    metadata: dict | None,
    db: AsyncSession,
) -> Message:
    msg = Message(
        session_id=session_id,
        role=role,
        content=content,
        metadata_json=metadata,
    )
    db.add(msg)
    await db.execute(
        update(Session)
        .where(Session.id == session_id)
        .values(message_count=Session.message_count + 1)
    )
    await db.flush()
    await _append_redis_ctx(session_id, role, content)
    return msg


async def get_messages(
    session_id: int,
    limit: int = 50,
    db: AsyncSession | None = None,
) -> list[Message]:
    safe_limit = max(1, min(limit, 500))

    async def _query(session: AsyncSession) -> list[Message]:
        result = await session.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.desc())
            .limit(safe_limit)
        )
        rows = list(result.scalars().all())
        rows.reverse()
        return rows

    if db is not None:
        return await _query(db)

    async with async_session() as session:
        return await _query(session)


async def get_recent_context(session_id: int, max_turns: int = 10) -> list[dict]:
    cap = max(1, min(max_turns, 50)) * 2
    key = _ctx_key(session_id)
    try:
        rc = get_redis_client()
        raw = await rc.get(key)
        if raw:
            msgs = json.loads(raw)
            if isinstance(msgs, list) and msgs:
                return msgs[-cap:] if len(msgs) > cap else msgs
    except Exception as e:
        logger.warning("读取会话 Redis 缓存失败: %s", e, exc_info=True)

    async with async_session() as db:
        result = await db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        all_msgs = list(result.scalars().all())
    if len(all_msgs) > cap:
        all_msgs = all_msgs[-cap:]
    return [{"role": str(m.role), "content": m.content} for m in all_msgs]
