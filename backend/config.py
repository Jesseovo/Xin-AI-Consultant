"""运行时配置管理，支持管理员动态修改"""
import json
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "data", "runtime_config.json")

_defaults = {
    "api_key": os.getenv("DASHSCOPE_API_KEY", ""),
    "base_url": os.getenv("DASHSCOPE_BASE_URL", "https://coding.dashscope.aliyuncs.com/v1"),
    "model": os.getenv("DEFAULT_MODEL", "qwen3.5-plus"),
    "teacher_name": "专业老师",
    "teacher_contact": "请联系学院办公室获取老师联系方式",
    "teacher_contact_type": "其他",
    "similarity_threshold": 0.15,
}

_runtime_config: dict = {}


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
    return merged


def update_config(new_values: dict) -> dict:
    global _runtime_config
    _load_config()
    _runtime_config.update(new_values)
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(_runtime_config, f, ensure_ascii=False, indent=2)
    return get_config()
