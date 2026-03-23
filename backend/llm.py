"""本地 OpenAI 兼容 LLM 调用（Ollama 等）"""
from collections.abc import Generator
from urllib.parse import urlparse
from openai import OpenAI
from .config import get_config

SYSTEM_PROMPT = """你是齐齐哈尔大学软件工程专业的智能问答助手“小软”。

回答规则：
1. 若提供了【参考资料】，优先依据资料回答，避免与资料冲突。
2. 若未提供资料或资料不足，可以基于通用知识回答，让用户先得到可执行建议。
3. 涉及校内具体制度、时间、收费、政策等，若资料不足请提醒“以学校最新通知为准”，不要编造精确数字。
4. 语气自然、温和、像学长学姐沟通，减少官话和模板腔。
5. 回答尽量清晰：先结论，再补充 1-3 条要点；避免长篇空话。
6. 不确定时直接说明不确定，并给出下一步建议（如咨询学院老师/官网通知）。

你不是冷冰冰的机器人，要让用户感到“有帮助、有温度、好理解”。"""

_client: OpenAI | None = None
_client_cfg_hash: str = ""
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}


def _is_local_base_url(base_url: str) -> bool:
    parsed = urlparse(base_url)
    return (parsed.hostname or "").lower() in _LOCAL_HOSTS


def resolve_api_key(cfg: dict) -> str:
    base_url = (cfg.get("base_url") or "").strip()
    if not base_url or not _is_local_base_url(base_url):
        raise RuntimeError("当前仅支持本地模型，请将 Base URL 设置为本地地址。")
    # 本地 OpenAI 兼容服务通常只需要一个占位 key。
    return "local-api-key"


def _get_client() -> tuple[OpenAI, dict]:
    global _client, _client_cfg_hash
    cfg = get_config()
    api_key = resolve_api_key(cfg)
    cfg_hash = f"{api_key}__{cfg.get('base_url','')}__{cfg.get('model','')}"
    if _client is None or cfg_hash != _client_cfg_hash:
        _client = OpenAI(
            api_key=api_key,
            base_url=cfg["base_url"],
            timeout=30.0,
            max_retries=1,
        )
        _client_cfg_hash = cfg_hash
    return _client, cfg


def _build_messages(question: str, context_items: list[dict]) -> list[dict]:
    if context_items:
        context_text = "\n\n".join(
            f"问：{item['question']}\n答：{item['answer']}"
            for item in context_items
        )
        user_message = f"""【参考资料】
{context_text}

【学生问题】
{question}

请结合参考资料回答，语气自然一些，不要太生硬。"""
    else:
        user_message = f"""【学生问题】
{question}

当前没有命中可用的校内知识库资料，请先基于你的通用知识给出有帮助的回答。
如果问题涉及校内具体政策，请提醒“以学校最新通知为准”。"""
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]


def chat_with_context(question: str, context_items: list[dict]) -> str:
    client, cfg = _get_client()
    response = client.chat.completions.create(
        model=cfg["model"],
        messages=_build_messages(question, context_items),
        temperature=0.7,
        max_tokens=512,
    )
    return response.choices[0].message.content


def chat_with_context_stream(question: str, context_items: list[dict]) -> Generator[str, None, None]:
    client, cfg = _get_client()
    stream = client.chat.completions.create(
        model=cfg["model"],
        messages=_build_messages(question, context_items),
        temperature=0.7,
        max_tokens=512,
        stream=True,
    )
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
