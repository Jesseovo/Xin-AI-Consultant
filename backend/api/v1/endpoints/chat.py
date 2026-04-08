"""对话端点 - 知识库问答核心"""
import inspect
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.deps import get_current_user, get_db
from backend.models.tutorbot import TutorBot
from backend.services import memory_service, session_service, tutorbot_service
from backend.services.knowledge_service import search_legacy
from backend.services.llm_router import chat_completion, chat_completion_stream
from backend.core.cache import get_cached, set_cached, make_cache_key

logger = logging.getLogger("xin-ai.chat")

router = APIRouter()

SYSTEM_PROMPT = """你是齐齐哈尔大学智能教学平台的 AI 助手"小新"。

回答规则：
1. 若提供了【参考资料】，优先依据资料回答，避免与资料冲突。
2. 若未提供资料或资料不足，可以基于通用知识回答，让用户先得到可执行建议。
3. 涉及校内具体制度、时间、收费、政策等，若资料不足请提醒"以学校最新通知为准"，不要编造精确数字。
4. 语气自然、温和、像学长学姐沟通，减少官话和模板腔。
5. 回答尽量清晰：先结论，再补充 1-3 条要点；避免长篇空话。
6. 不确定时直接说明不确定，并给出下一步建议。

你不是冷冰冰的机器人，要让用户感到"有帮助、有温度、好理解"。"""


def _build_messages(question: str, context_items: list[dict], system_prompt: str | None = None) -> list[dict]:
    prompt = system_prompt or SYSTEM_PROMPT

    if context_items:
        context_text = "\n\n".join(
            f"问：{item['question']}\n答：{item['answer']}" for item in context_items
        )
        user_message = f"【参考资料】\n{context_text}\n\n【学生问题】\n{question}\n\n请结合参考资料回答，语气自然一些。"
    else:
        user_message = f"【学生问题】\n{question}\n\n当前没有命中校内知识库资料，请基于通用知识给出有帮助的回答。如涉及校内政策，请提醒以学校最新通知为准。"

    return [
        {"role": "system", "content": prompt},
        {"role": "user", "content": user_message},
    ]


def _format_rag_items(context_items: list[dict]) -> str:
    parts = []
    for item in context_items:
        q = item.get("question") or item.get("query") or ""
        a = item.get("answer") or item.get("content") or item.get("text") or ""
        parts.append(f"问：{q}\n答：{a}")
    return "\n\n".join(parts)


def _build_user_content_with_rag(question: str, context_items: list[dict]) -> str:
    if context_items:
        context_text = _format_rag_items(context_items)
        return (
            f"【参考资料】\n{context_text}\n\n【学生问题】\n{question}\n\n请结合参考资料回答，语气自然一些。"
        )
    return (
        f"【学生问题】\n{question}\n\n"
        f"当前未命中或未启用知识库片段，请基于通用知识给出有帮助的回答。如涉及校内政策，请提醒以学校最新通知为准。"
    )


async def _run_rag(query: str, kb_ids: list[int] | None) -> list[dict]:
    try:
        from backend.services.rag_pipeline import hybrid_search as _hybrid
    except ImportError:
        return search_legacy(query, top_k=5)
    try:
        result = _hybrid(query, kb_ids=kb_ids, top_k=5)
        if inspect.isawaitable(result):
            result = await result
        if isinstance(result, list):
            return result
    except TypeError:
        try:
            result = _hybrid(query, top_k=5)
            if inspect.isawaitable(result):
                result = await result
            if isinstance(result, list):
                return result
        except Exception:
            logger.debug("hybrid_search 兼容调用失败，回退旧版检索", exc_info=True)
    except Exception:
        logger.warning("hybrid_search 失败，回退旧版检索", exc_info=True)
    return search_legacy(query, top_k=5)


async def _assert_bot_usable(bot_id: int, user, db: AsyncSession) -> TutorBot:
    result = await db.execute(select(TutorBot).where(TutorBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot or not bot.is_active:
        raise HTTPException(status_code=404, detail="TutorBot 不存在或已停用")
    if not bot.is_public and bot.teacher_id != user.id:
        raise HTTPException(status_code=403, detail="无权使用该 TutorBot")
    return bot


async def _resolve_system_prompt(bot_id: int | None, user, db: AsyncSession) -> str:
    if not bot_id:
        return SYSTEM_PROMPT
    await _assert_bot_usable(bot_id, user, db)
    bot, _ = await tutorbot_service.get_bot_with_kb(bot_id, db)
    return await tutorbot_service.build_system_prompt(bot)


async def _run_memory_refresh(user_id: int, bot_id: int | None, interaction: str) -> None:
    from backend.db.mysql import async_session

    try:
        async with async_session() as s:
            profile = await memory_service.get_or_create_profile(user_id, bot_id, s)
            await memory_service.update_summary(profile, interaction, s)
    except Exception as e:
        logger.error("后台更新学习画像失败: %s", e, exc_info=True)


# ===== 旧版兼容接口 =====

class LegacyChatRequest(BaseModel):
    question: str


async def legacy_chat(req: LegacyChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    threshold = 0.15
    results = search_legacy(question, top_k=3)
    has_context = bool(results and results[0]["score"] >= threshold)
    context_items = results if has_context else []

    cache_key = make_cache_key(question)
    cached = await get_cached("chat:qa", cache_key)
    if cached:
        return {"answer": cached["answer"], "can_answer": has_context, "sources": context_items}

    try:
        messages = _build_messages(question, context_items)
        response = await chat_completion(messages=messages)
        answer = response.choices[0].message.content

        await set_cached("chat:qa", cache_key, {"answer": answer}, ttl=1800)
        return {"answer": answer, "can_answer": has_context, "sources": context_items}
    except Exception as e:
        logger.error("LLM 调用失败: %s", e, exc_info=True)
        return {
            "answer": "AI 服务暂时不可用，请稍后再试。",
            "can_answer": False,
            "sources": context_items,
        }


async def legacy_chat_stream(req: LegacyChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    threshold = 0.15
    results = search_legacy(question, top_k=3)
    has_context = bool(results and results[0]["score"] >= threshold)
    context_items = results if has_context else []

    async def event_generator() -> AsyncIterator[str]:
        meta = {"type": "meta", "can_answer": has_context, "sources": context_items, "teacher_contact": None}
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

        try:
            messages = _build_messages(question, context_items)
            async for chunk in chat_completion_stream(messages=messages):
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error("LLM 流式调用失败: %s", e, exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'content': 'AI 服务暂时不可用，请稍后再试。'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ===== 新版 V1 接口 =====

class ChatV1SendRequest(BaseModel):
    message: str
    session_id: int | None = None
    bot_id: int | None = None
    mode: str = Field(default="chat")
    kb_ids: list[int] | None = None


def _build_v1_messages(
    *,
    system_prompt: str,
    memory_context: str,
    history: list[dict],
    user_content: str,
) -> list[dict]:
    out: list[dict] = [{"role": "system", "content": system_prompt}]
    if memory_context.strip():
        out.append({"role": "system", "content": memory_context})
    for turn in history:
        r = turn.get("role")
        c = turn.get("content")
        if r in ("user", "assistant") and c:
            out.append({"role": r, "content": c})
    out.append({"role": "user", "content": user_content})
    return out


@router.post("/send")
async def send_message(
    req: ChatV1SendRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = (req.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="消息不能为空")

    eff_bot_id: int | None
    eff_mode: str

    if req.session_id is not None:
        sess = await session_service.get_session(req.session_id, user.id, db)
        if not sess:
            raise HTTPException(status_code=404, detail="会话不存在或无权访问")
        eff_bot_id = sess.bot_id
        eff_mode = sess.mode or "chat"
    else:
        eff_bot_id = req.bot_id
        eff_mode = req.mode or "chat"
        if eff_bot_id is not None:
            await _assert_bot_usable(eff_bot_id, user, db)
        sess = await session_service.create_session(user.id, eff_bot_id, eff_mode, db)
        await db.flush()

    try:
        system_prompt = await _resolve_system_prompt(eff_bot_id, user, db)
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=404, detail="TutorBot 不存在或已停用")

    kb_ids = req.kb_ids
    if kb_ids is None and eff_bot_id:
        _, linked = await tutorbot_service.get_bot_with_kb(eff_bot_id, db)
        kb_ids = linked or None

    sources = await _run_rag(text, kb_ids)
    memory_ctx = await memory_service.get_context_from_memory(user.id, eff_bot_id, db)
    history = await session_service.get_recent_context(sess.id)
    user_llm_content = _build_user_content_with_rag(text, sources)
    messages = _build_v1_messages(
        system_prompt=system_prompt,
        memory_context=memory_ctx,
        history=history,
        user_content=user_llm_content,
    )

    await session_service.add_message(sess.id, "user", text, None, db)
    await db.commit()

    try:
        response = await chat_completion(messages=messages)
        answer = response.choices[0].message.content or ""
    except Exception as e:
        logger.error("新版对话 LLM 失败: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="AI 服务暂时不可用，请稍后再试。")

    await session_service.add_message(sess.id, "assistant", answer, {"sources": sources}, db)
    if eff_bot_id:
        await tutorbot_service.increment_usage(eff_bot_id, db)
    await db.commit()

    interaction = f"学生问：{text[:2000]}\n助手答：{answer[:2000]}"
    background_tasks.add_task(_run_memory_refresh, user.id, eff_bot_id, interaction)

    return {
        "answer": answer,
        "session_id": sess.id,
        "sources": sources,
        "mode": eff_mode,
    }


@router.post("/stream")
async def stream_message(
    req: ChatV1SendRequest,
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    text = (req.message or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="消息不能为空")

    eff_bot_id: int | None
    eff_mode: str

    if req.session_id is not None:
        sess = await session_service.get_session(req.session_id, user.id, db)
        if not sess:
            raise HTTPException(status_code=404, detail="会话不存在或无权访问")
        eff_bot_id = sess.bot_id
        eff_mode = sess.mode or "chat"
    else:
        eff_bot_id = req.bot_id
        eff_mode = req.mode or "chat"
        if eff_bot_id is not None:
            await _assert_bot_usable(eff_bot_id, user, db)
        sess = await session_service.create_session(user.id, eff_bot_id, eff_mode, db)
        await db.flush()

    try:
        system_prompt = await _resolve_system_prompt(eff_bot_id, user, db)
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=404, detail="TutorBot 不存在或已停用")

    kb_ids = req.kb_ids
    if kb_ids is None and eff_bot_id:
        _, linked = await tutorbot_service.get_bot_with_kb(eff_bot_id, db)
        kb_ids = linked or None

    sources = await _run_rag(text, kb_ids)
    memory_ctx = await memory_service.get_context_from_memory(user.id, eff_bot_id, db)
    history = await session_service.get_recent_context(sess.id)
    user_llm_content = _build_user_content_with_rag(text, sources)
    messages = _build_v1_messages(
        system_prompt=system_prompt,
        memory_context=memory_ctx,
        history=history,
        user_content=user_llm_content,
    )

    await session_service.add_message(sess.id, "user", text, None, db)
    await db.commit()

    sid = sess.id
    uid = user.id
    bid = eff_bot_id

    async def event_generator() -> AsyncIterator[str]:
        meta = {"type": "meta", "session_id": sid, "sources": sources, "mode": eff_mode}
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"
        full_answer: list[str] = []
        try:
            async for chunk in chat_completion_stream(messages=messages):
                full_answer.append(chunk)
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk}, ensure_ascii=False)}\n\n"
            answer = "".join(full_answer)
            from backend.db.mysql import async_session

            try:
                async with async_session() as stream_db:
                    await session_service.add_message(
                        sid, "assistant", answer, {"sources": sources}, stream_db
                    )
                    if bid:
                        await tutorbot_service.increment_usage(bid, stream_db)
                    await stream_db.commit()
            except Exception as e:
                logger.error("流式结束后保存消息失败: %s", e, exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'content': '保存回复失败，请重试。'}, ensure_ascii=False)}\n\n"
                return

            interaction = f"学生问：{text[:2000]}\n助手答：{answer[:2000]}"
            background_tasks.add_task(_run_memory_refresh, uid, bid, interaction)
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error("新版流式 LLM 失败: %s", e, exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'content': 'AI 服务暂时不可用，请稍后再试。'}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions")
async def list_chat_sessions(
    bot_id: int | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=200),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await session_service.list_sessions(user.id, bot_id, limit, db)
    return {
        "sessions": [
            {
                "id": s.id,
                "bot_id": s.bot_id,
                "title": s.title,
                "mode": s.mode,
                "message_count": s.message_count,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in rows
        ]
    }


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sess = await session_service.get_session(session_id, user.id, db)
    if not sess:
        raise HTTPException(status_code=404, detail="会话不存在或无权访问")
    msgs = await session_service.get_messages(session_id, limit=limit, db=db)
    return {
        "session_id": session_id,
        "messages": [
            {
                "id": m.id,
                "role": str(m.role),
                "content": m.content,
                "metadata": m.metadata_json,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in msgs
        ],
    }
