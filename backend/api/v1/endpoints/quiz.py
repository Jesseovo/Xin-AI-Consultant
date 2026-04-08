"""测验 API"""
import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.deps import get_current_user, get_db
from backend.models.quiz import Quiz, QuizAttempt
from backend.models.tutorbot import TutorBot
from backend.services.chat_modes.quiz_mode import generate_quiz, grade_quiz
from backend.services.knowledge_service import search_legacy

logger = logging.getLogger("xin-ai.api.quiz")

router = APIRouter()


class QuizGenerateRequest(BaseModel):
    topic: str
    num_questions: int = Field(default=5, ge=1, le=30)
    question_types: list[str] = Field(default_factory=lambda: ["choice", "true_false", "fill_blank"])
    kb_id: int | None = None


class QuizSubmitRequest(BaseModel):
    answers: list[dict]


async def _assert_quiz_accessible(quiz: Quiz, user, db: AsyncSession) -> None:
    if quiz.creator_id == user.id:
        return
    if quiz.bot_id is not None:
        r = await db.execute(select(TutorBot).where(TutorBot.id == quiz.bot_id))
        bot = r.scalar_one_or_none()
        if bot and bot.is_active and (bot.is_public or bot.teacher_id == user.id):
            return
    raise HTTPException(status_code=403, detail="无权访问该测验")


def _questions_from_stored(raw: dict | list) -> list[dict]:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        q = raw.get("questions")
        if isinstance(q, list):
            return q
    return []


@router.post("/generate")
async def generate_quiz_endpoint(
    req: QuizGenerateRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="主题不能为空")

    ctx = search_legacy(topic, top_k=6)
    try:
        data = await generate_quiz(
            topic=topic,
            knowledge_context=ctx,
            num_questions=req.num_questions,
            question_types=req.question_types,
        )
    except Exception as e:
        logger.error("生成测验异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="测验生成服务暂时不可用，请稍后重试。") from e

    questions = data.get("questions") or []
    if not questions:
        raise HTTPException(status_code=422, detail=data.get("message") or "未能生成有效题目，请调整主题后重试。")

    payload = {"title": data.get("title") or topic, "questions": questions}
    quiz = Quiz(
        creator_id=user.id,
        kb_id=req.kb_id,
        title=payload["title"],
        questions=payload,
        settings=None,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)

    return {
        "id": quiz.id,
        "title": quiz.title,
        "questions": questions,
        "message": "测验已生成并保存。",
    }


@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: int,
    req: QuizSubmitRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="测验不存在")

    await _assert_quiz_accessible(quiz, user, db)

    stored = quiz.questions
    qlist = _questions_from_stored(stored)
    if not qlist:
        raise HTTPException(status_code=400, detail="测验数据无效")

    try:
        grading = await grade_quiz(qlist, req.answers)
    except Exception as e:
        logger.error("批改异常: %s", e, exc_info=True)
        raise HTTPException(status_code=503, detail="批改服务暂时不可用，请稍后重试。") from e

    score_val = grading.get("score", 0)
    try:
        score_dec = Decimal(str(float(score_val)))
    except (TypeError, ValueError):
        score_dec = Decimal("0")

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=user.id,
        answers={"items": req.answers},
        score=score_dec,
        feedback=grading,
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return {
        "attempt_id": attempt.id,
        "score": grading.get("score"),
        "total": grading.get("total"),
        "results": grading.get("results", []),
        "message": "提交成功。",
    }


@router.get("/")
async def list_quizzes(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz).where(Quiz.creator_id == user.id).order_by(Quiz.created_at.desc())
    )
    rows = result.scalars().all()
    return [
        {
            "id": q.id,
            "title": q.title,
            "created_at": q.created_at.isoformat() if q.created_at else None,
            "question_count": len(_questions_from_stored(q.questions)),
        }
        for q in rows
    ]


@router.get("/{quiz_id}")
async def get_quiz_detail(
    quiz_id: int,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="测验不存在")

    await _assert_quiz_accessible(quiz, user, db)

    qlist = _questions_from_stored(quiz.questions)
    title = quiz.title
    if isinstance(quiz.questions, dict) and quiz.questions.get("title"):
        title = quiz.questions["title"]

    return {
        "id": quiz.id,
        "title": title,
        "questions": qlist,
        "creator_id": quiz.creator_id,
        "is_mine": quiz.creator_id == user.id,
        "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
    }
