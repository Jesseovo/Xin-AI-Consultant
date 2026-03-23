"""FastAPI 后端入口"""
import sys
import os
import logging
import json
import asyncio
from collections.abc import AsyncIterator

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

from backend.knowledge import (
    load_knowledge,
    search,
    import_knowledge_from_bytes,
    get_knowledge_stats,
)
from backend.llm import chat_with_context, chat_with_context_stream, resolve_api_key
from backend.config import get_config, update_config

logger = logging.getLogger("qa-system")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_knowledge()
    yield


app = FastAPI(title="齐大软工智能问答系统", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_admin(x_admin_token: str = Header(default="")):
    admin_pw = os.getenv("ADMIN_PASSWORD", "admin123")
    if not x_admin_token or x_admin_token != admin_pw:
        raise HTTPException(status_code=401, detail="管理员密码错误")


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    can_answer: bool
    sources: list[dict] = []
    teacher_contact: dict | None = None


class ConfigUpdate(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None
    teacher_name: str | None = None
    teacher_contact: str | None = None
    teacher_contact_type: str | None = None
    similarity_threshold: float | None = None


class AdminLoginRequest(BaseModel):
    password: str


def _make_teacher_contact(cfg: dict) -> dict:
    return {
        "name": cfg.get("teacher_name", "专业老师"),
        "contact": cfg.get("teacher_contact", "请联系学院办公室"),
        "type": cfg.get("teacher_contact_type", "其他"),
    }


def _mask_api_key(cfg: dict) -> dict:
    safe = {**cfg}
    if safe.get("api_key"):
        key = safe["api_key"]
        safe["api_key"] = key[:8] + "****" + key[-4:] if len(key) > 12 else "****"
    return safe


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    cfg = get_config()
    threshold = cfg.get("similarity_threshold", 0.15)
    results = search(question, top_k=3)

    if not results or results[0]["score"] < threshold:
        return ChatResponse(
            answer="抱歉，这个问题超出了我目前的知识范围。建议您联系专业老师获取更详细的解答。",
            can_answer=False,
            sources=[],
            teacher_contact=_make_teacher_contact(cfg),
        )

    try:
        answer = await asyncio.to_thread(chat_with_context, question, results)
        return ChatResponse(answer=answer, can_answer=True, sources=results)
    except Exception as e:
        logger.error("LLM 调用失败: %s", e, exc_info=True)
        return ChatResponse(
            answer="AI 服务暂时不可用，请稍后再试。如有急需，请直接联系老师。",
            can_answer=False,
            sources=results,
            teacher_contact=_make_teacher_contact(cfg),
        )


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="问题不能为空")

    cfg = get_config()
    threshold = cfg.get("similarity_threshold", 0.15)
    results = search(question, top_k=3)

    async def event_generator() -> AsyncIterator[str]:
        can_answer = bool(results and results[0]["score"] >= threshold)

        meta = {
            "type": "meta",
            "can_answer": can_answer,
            "sources": results if can_answer else [],
            "teacher_contact": None if can_answer else _make_teacher_contact(cfg),
        }
        yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

        if not can_answer:
            fallback = "抱歉，这个问题超出了我目前的知识范围。建议您联系专业老师获取更详细的解答。"
            yield f"data: {json.dumps({'type': 'delta', 'content': fallback}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return

        try:
            import queue, threading
            q: queue.Queue[str | None | Exception] = queue.Queue()

            def _run_stream():
                try:
                    for chunk in chat_with_context_stream(question, results):
                        q.put(chunk)
                    q.put(None)
                except Exception as exc:
                    q.put(exc)

            threading.Thread(target=_run_stream, daemon=True).start()

            while True:
                item = await asyncio.to_thread(q.get)
                if item is None:
                    break
                if isinstance(item, Exception):
                    raise item
                yield f"data: {json.dumps({'type': 'delta', 'content': item}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.error("LLM 流式调用失败: %s", e, exc_info=True)
            err_msg = "AI 服务暂时不可用，请稍后再试。如有急需，请直接联系老师。"
            yield f"data: {json.dumps({'type': 'error', 'content': err_msg}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/admin/login")
async def admin_login(req: AdminLoginRequest):
    admin_pw = os.getenv("ADMIN_PASSWORD", "admin123")
    if req.password != admin_pw:
        raise HTTPException(status_code=401, detail="密码错误")
    return {"token": admin_pw, "message": "登录成功"}


@app.get("/api/admin/config")
async def get_admin_config(_=Depends(verify_admin)):
    return _mask_api_key(get_config())


@app.post("/api/admin/config")
async def update_admin_config(req: ConfigUpdate, _=Depends(verify_admin)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="没有需要更新的配置")
    cfg = update_config(updates)
    return {"message": "配置更新成功", "config": _mask_api_key(cfg)}


@app.get("/api/admin/knowledge/stats")
async def get_knowledge_stats_api(_=Depends(verify_admin)):
    stats = await asyncio.to_thread(get_knowledge_stats)
    return stats


@app.post("/api/admin/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...), _=Depends(verify_admin)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="未选择文件")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件为空")
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="文件过大，请控制在 20MB 内")

    try:
        count = await asyncio.to_thread(import_knowledge_from_bytes, file.filename, content)
        return {
            "message": f"知识库更新成功，共 {count} 条问答已生效。",
            "count": count,
            "filename": file.filename,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error("知识库上传失败: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="知识库上传失败，请稍后重试。") from e


@app.post("/api/admin/test-connection")
async def test_connection(_=Depends(verify_admin)):
    cfg = get_config()
    api_key = resolve_api_key(cfg)
    if not api_key:
        return {"success": False, "message": "未配置 API Key（远程模型必填）"}
    try:
        def _test():
            client = OpenAI(api_key=api_key, base_url=cfg["base_url"])
            client.chat.completions.create(
                model=cfg["model"],
                messages=[{"role": "user", "content": "你好"}],
                max_tokens=10,
            )
        await asyncio.to_thread(_test)
        return {"success": True, "message": f"连接成功！模型 {cfg['model']} 已就绪。"}
    except Exception as e:
        logger.error("API 连接测试失败: %s", e)
        return {"success": False, "message": f"连接失败：{str(e)[:100]}"}


@app.get("/api/health")
async def health():
    return {"status": "ok", "message": "齐大软工智能问答系统运行中"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
