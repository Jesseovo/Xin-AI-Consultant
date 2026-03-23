"""阿里云百炼 LLM 调用，兼容 OpenAI 协议"""
from collections.abc import Generator
from urllib.parse import urlparse
from openai import OpenAI
from .config import get_config

SYSTEM_PROMPT = """你是齐齐哈尔大学软件工程专业的智能问答助手"小软"。

你的职责：
1. 基于提供的【参考资料】回答学生的问题
2. 回答要准确、友好、贴近学生，可以用自己的语言组织，但内容必须基于参考资料
3. 如果参考资料不足以完整回答问题，请诚实告知，并建议学生联系老师获取更详细的信息
4. 绝对不允许编造参考资料中没有的事实、数据或信息
5. 回答时可以适当补充一些鼓励性的话语
6. 回答尽量简洁精炼，直击要点，避免冗长

注意事项：
- 你只能回答与齐齐哈尔大学软件工程专业相关的问题
- 对于完全无关的问题，礼貌地告知学生这超出了你的知识范围"""

_client: OpenAI | None = None
_client_cfg_hash: str = ""
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}


def _is_local_base_url(base_url: str) -> bool:
    parsed = urlparse(base_url)
    return (parsed.hostname or "").lower() in _LOCAL_HOSTS


def resolve_api_key(cfg: dict) -> str:
    api_key = (cfg.get("api_key") or "").strip()
    if api_key:
        return api_key
    base_url = (cfg.get("base_url") or "").strip()
    if base_url and _is_local_base_url(base_url):
        # 本地 OpenAI 兼容服务通常只需要一个占位 key。
        return "local-api-key"
    return ""


def _get_client() -> tuple[OpenAI, dict]:
    global _client, _client_cfg_hash
    cfg = get_config()
    api_key = resolve_api_key(cfg)
    if not api_key:
        raise RuntimeError("未配置 API Key，请在管理后台填写后重试。")
    cfg_hash = f"{api_key}__{cfg.get('base_url','')}"
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
    context_text = "\n\n".join(
        f"问：{item['question']}\n答：{item['answer']}"
        for item in context_items
    )
    user_message = f"""【参考资料】
{context_text}

【学生问题】
{question}

请基于以上参考资料简洁地回答学生的问题。"""
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
