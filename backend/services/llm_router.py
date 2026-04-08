"""多模型路由 - 基于 litellm 统一调用 LLM"""
import logging
from collections.abc import AsyncGenerator

import litellm

from backend.app.config import get_settings
from backend.core.cache import get_cached, set_cached, make_cache_key

logger = logging.getLogger("xin-ai.llm")
settings = get_settings()

litellm.drop_params = True


def _build_model_string() -> str:
    provider = settings.llm_provider.lower()
    model = settings.llm_model

    if provider == "ollama":
        return f"ollama/{settings.ollama_model}"
    elif provider == "deepseek":
        return f"deepseek/{model}"
    elif provider in ("dashscope", "aliyun", "qwen"):
        # 阿里云百炼 / DashScope：走 OpenAI 兼容协议
        return f"openai/{model}"
    elif provider == "openai":
        return f"openai/{model}"
    elif provider == "anthropic":
        return f"anthropic/{model}"
    else:
        return f"openai/{model}"


def _get_api_params() -> dict:
    """获取当前 LLM 的 API 参数"""
    provider = settings.llm_provider.lower()

    if provider == "ollama" or (settings.ollama_enabled and provider == "ollama"):
        return {"api_key": "ollama", "api_base": settings.ollama_base_url}
    else:
        params = {}
        if settings.llm_api_key:
            params["api_key"] = settings.llm_api_key
        if settings.llm_base_url:
            params["api_base"] = settings.llm_base_url
        return params


async def chat_completion(
    messages: list[dict],
    temperature: float | None = None,
    max_tokens: int | None = None,
    stream: bool = False,
    **kwargs,
):
    model = _build_model_string()
    api_params = _get_api_params()

    params = {
        "model": model,
        "messages": messages,
        "temperature": temperature or settings.llm_temperature,
        "max_tokens": max_tokens or settings.llm_max_tokens,
        "stream": stream,
        **api_params,
        **kwargs,
    }

    logger.info("LLM 调用: model=%s, messages=%d条", model, len(messages))

    if stream:
        return await litellm.acompletion(**params)
    else:
        response = await litellm.acompletion(**params)
        choices = getattr(response, "choices", None)
        if not choices:
            raise ValueError("LLM 返回无有效 choices")
        first = choices[0]
        msg = getattr(first, "message", None)
        if msg is None:
            raise ValueError("LLM 返回消息结构无效")
        return response


async def chat_completion_stream(
    messages: list[dict],
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> AsyncGenerator[str, None]:
    response = await chat_completion(
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    async for chunk in response:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def cached_chat(
    messages: list[dict],
    cache_key: str | None = None,
    cache_ttl: int = 1800,
    **kwargs,
) -> str:
    """带 Redis 缓存的对话（用于热点问答）"""
    if cache_key:
        cached = await get_cached("chat:qa", cache_key)
        if cached:
            logger.info("命中缓存: %s", cache_key[:16])
            return cached["answer"]

    response = await chat_completion(messages=messages, **kwargs)
    choices = getattr(response, "choices", None)
    if not choices:
        raise ValueError("LLM 返回无有效 choices")
    msg = getattr(choices[0], "message", None)
    if msg is None:
        raise ValueError("LLM 返回消息结构无效")
    answer = msg.content

    if cache_key and answer:
        await set_cached("chat:qa", cache_key, {"answer": answer}, ttl=cache_ttl)

    return answer


async def test_connection() -> dict:
    """测试当前 LLM 连接"""
    try:
        response = await chat_completion(
            messages=[{"role": "user", "content": "你好，请回复一个字"}],
            max_tokens=10,
        )
        model_name = _build_model_string()
        return {"success": True, "message": f"模型连接成功: {model_name}"}
    except Exception as e:
        logger.error("LLM 连接测试失败: %s", e)
        return {"success": False, "message": f"连接失败: {str(e)[:200]}"}
