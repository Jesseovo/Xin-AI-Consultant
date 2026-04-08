"""TutorBot 人格模板与系统提示构建"""
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.tutorbot import TutorBot

SOUL_TEMPLATES: dict[str, str] = {
    "socratic": (
        "你是名为「{name}」的学习导师，面向「{subject}」领域开展辅导。{persona}\n"
        "教学风格：苏格拉底式引导。多用层层递进的问题启发学生独立思考，避免直接给出完整答案；"
        "在学生卡顿时给予最小提示；鼓励学生说明推理过程。"
    ),
    "encouraging": (
        "你是名为「{name}」的学习伙伴，专注「{subject}」。{persona}\n"
        "教学风格：耐心鼓励型。语气温暖、肯定努力，先认可学生的尝试再指出改进方向；"
        "将难点拆成小步骤，允许犯错并强调进步；避免批评人格，聚焦具体行为与策略。"
    ),
    "rigorous": (
        "你是名为「{name}」的学术导师，授课领域为「{subject}」。{persona}\n"
        "教学风格：严谨学术型。概念、定义与推理链条必须清晰；区分事实与推测；"
        "要求学生给出依据；对模糊表述会追问澄清；引用或结论需符合逻辑。"
    ),
    "friendly": (
        "你是名为「{name}」的学长/学姐型助手，主要聊「{subject}」相关学习。{persona}\n"
        "教学风格：朋友般亲切。语言自然口语化，可适当用类比与例子；"
        "保持平等对话感，但仍需保证知识准确；轻松但不随意敷衍。"
    ),
    "practical": (
        "你是名为「{name}」的实训向导师，侧重「{subject}」的落地应用。{persona}\n"
        "教学风格：实践导向型。优先给出可操作的步骤、练习建议与自检清单；"
        "结合常见题型或场景举例；理论点到为止，强调「怎么做」和「怎么验」。"
    ),
}

_DEFAULT_STYLE = "friendly"


def _format_subject(subject_tags: dict | list | str | None) -> str:
    if subject_tags is None:
        return "综合学科"
    if isinstance(subject_tags, str):
        return subject_tags.strip() or "综合学科"
    if isinstance(subject_tags, list):
        return "、".join(str(x) for x in subject_tags) or "综合学科"
    if isinstance(subject_tags, dict):
        parts = [f"{k}：{v}" for k, v in subject_tags.items()]
        return "；".join(parts) if parts else "综合学科"
    return "综合学科"


async def build_system_prompt(bot: TutorBot) -> str:
    custom = (bot.system_prompt or "").strip()
    if custom:
        return custom

    style = (bot.teaching_style or _DEFAULT_STYLE).strip().lower()
    if style not in SOUL_TEMPLATES:
        style = _DEFAULT_STYLE

    template = SOUL_TEMPLATES[style]
    name = bot.name or "小新导师"
    subject = _format_subject(bot.subject_tags)
    persona = (bot.persona or "").strip()
    if persona:
        persona = f"人格与定位补充：{persona}"
    return template.format(name=name, subject=subject, persona=persona)


async def get_bot_with_kb(bot_id: int, db: AsyncSession) -> tuple[TutorBot, list[int]]:
    result = await db.execute(
        select(TutorBot)
        .options(selectinload(TutorBot.knowledge_links))
        .where(TutorBot.id == bot_id, TutorBot.is_active == True)
    )
    bot = result.scalar_one_or_none()
    if not bot:
        raise ValueError("机器人不存在或已停用")

    kb_ids = [link.kb_id for link in (bot.knowledge_links or [])]
    return bot, kb_ids


async def increment_usage(bot_id: int, db: AsyncSession) -> None:
    await db.execute(
        update(TutorBot)
        .where(TutorBot.id == bot_id)
        .values(usage_count=TutorBot.usage_count + 1)
    )
