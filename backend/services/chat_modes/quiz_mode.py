"""测验生成与批改"""
import json
import logging
import re

from backend.services.llm_router import chat_completion

logger = logging.getLogger("xin-ai.quiz-mode")


def _parse_json_object(text: str) -> dict | None:
    if not text:
        return None
    t = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", t)
    if m:
        t = m.group(1).strip()
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        start, end = t.find("{"), t.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(t[start : end + 1])
            except json.JSONDecodeError:
                pass
    return None


def _format_kb(ctx: list[dict]) -> str:
    if not ctx:
        return "（无额外知识上下文，请基于主题与通用教学知识出题。）"
    return "\n\n".join(
        f"条目{i + 1} 问：{c.get('question', '')}\n答：{c.get('answer', '')}" for i, c in enumerate(ctx[:20])
    )


async def generate_quiz(
    topic: str,
    knowledge_context: list[dict],
    num_questions: int = 5,
    question_types: list[str] | None = None,
) -> dict:
    types = question_types or ["choice", "true_false", "fill_blank"]
    types_str = "、".join(types)
    kb = _format_kb(knowledge_context)

    system = (
        "你是专业出题教师。必须只输出一个合法 JSON 对象，不要 Markdown 或其它说明。"
        "JSON 结构：{\"title\": string, \"questions\": array}。"
        "每个题目对象含：type（choice|true_false|fill_blank）、question、options（仅 choice 时为字符串数组，4 项）、"
        "answer（choice 为正确选项全文或字母；true_false 为 \"对\" 或 \"错\"；fill_blank 为参考答案短语）、"
        "explanation（简短中文解析）。"
        f"题目数量为 {num_questions}，题型从以下类型中选用：{types_str}。"
    )
    user = f"主题：{topic}\n\n【知识上下文】\n{kb}\n"

    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.6,
        )
        raw = resp.choices[0].message.content or ""
        data = _parse_json_object(raw)
        if not data or "questions" not in data:
            logger.warning("测验 JSON 解析失败，返回占位结构")
            return {
                "title": topic,
                "questions": [],
                "message": "题目生成格式异常，请重试。",
            }
        data.setdefault("title", topic)
        return data
    except Exception as e:
        logger.error("generate_quiz 失败: %s", e, exc_info=True)
        return {"title": topic, "questions": [], "message": "题目生成失败，请稍后重试。"}


async def grade_quiz(quiz_questions: list[dict], student_answers: list[dict]) -> dict:
    system = (
        "你是阅卷助手。根据题目与参考答案，判断学生答案是否正确。"
        "填空与简答允许同义表述，判断要合理宽松。"
        "只输出一个 JSON：{\"score\": number, \"total\": number, \"results\": array}。"
        "results 每项：question, student_answer, correct_answer, is_correct (boolean), feedback (中文短评)。"
        "score 为答对题数，total 为题数。"
    )
    payload = {"questions": quiz_questions, "student_answers": student_answers}
    user = json.dumps(payload, ensure_ascii=False)

    try:
        resp = await chat_completion(
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.2,
        )
        raw = resp.choices[0].message.content or ""
        data = _parse_json_object(raw)
        if not data or "results" not in data:
            return {
                "score": 0,
                "total": len(quiz_questions),
                "results": [],
                "message": "批改结果解析失败。",
            }
        data.setdefault("total", len(quiz_questions))
        data.setdefault("score", 0)
        return data
    except Exception as e:
        logger.error("grade_quiz 失败: %s", e, exc_info=True)
        return {
            "score": 0,
            "total": len(quiz_questions),
            "results": [],
            "message": "批改失败，请稍后重试。",
        }
