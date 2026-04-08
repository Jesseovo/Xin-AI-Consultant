"""运行时配置管理，支持管理员动态修改"""
import json
import os
from urllib.parse import urlparse
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "data", "runtime_config.json")
_LOCAL_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0"}

_defaults = {
    # 当前项目默认仅使用本地 OpenAI 兼容模型服务（如 Ollama）。
    "base_url": os.getenv("LOCAL_LLM_BASE_URL", "http://127.0.0.1:11435/v1"),
    "model": os.getenv("LOCAL_LLM_MODEL", "qwen2.5:3b"),
    "teacher_name": "专业老师",
    "teacher_contact": "请联系学院办公室获取老师联系方式",
    "teacher_contact_type": "其他",
    "similarity_threshold": 0.15,
}

_runtime_config: dict = {}


def is_local_base_url(base_url: str) -> bool:
    parsed = urlparse((base_url or "").strip())
    return (parsed.hostname or "").lower() in _LOCAL_HOSTS


def _load_config() -> dict:
    global _runtime_config
    if os.path.exists(CONFIG_FILE):
        # 兼容带/不带 BOM 的 UTF-8 配置文件（PowerShell 常会写入 BOM）。
        with open(CONFIG_FILE, "r", encoding="utf-8-sig") as f:
            _runtime_config = json.load(f)
    else:
        _runtime_config = {}
    return _runtime_config


def get_config() -> dict:
    if not _runtime_config:
        _load_config()
    merged = {**_defaults, **_runtime_config}
    # 忽略历史遗留的远程 key，统一走本地模型模式。
    merged.pop("api_key", None)
    # 若历史配置里写入了远程地址，自动回退到本地默认地址，避免误走付费云接口。
    if not is_local_base_url(merged.get("base_url", "")):
        merged["base_url"] = _defaults["base_url"]
    return merged


def update_config(new_values: dict) -> dict:
    global _runtime_config
    _load_config()
    sanitized = {**new_values}
    # 管理后台不再维护远程 API Key。
    sanitized.pop("api_key", None)
    if "base_url" in sanitized:
        base_url = str(sanitized["base_url"]).strip()
        if not is_local_base_url(base_url):
            raise ValueError("仅支持本地模型地址，请使用 localhost/127.0.0.1/0.0.0.0。")
        sanitized["base_url"] = base_url

    _runtime_config.pop("api_key", None)
    _runtime_config.update(sanitized)
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(_runtime_config, f, ensure_ascii=False, indent=2)
    return get_config()
