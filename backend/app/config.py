"""统一配置管理，基于 Pydantic Settings"""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    admin_password: str = ""

    # 数据库模式：sqlite（默认，零依赖）或 mysql
    db_backend: str = "sqlite"

    # MySQL
    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_name: str = "xin_ai"
    db_user: str = "xin_user"
    db_password: str = ""

    # Redis
    redis_host: str = "127.0.0.1"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ""

    # LLM
    llm_provider: str = "dashscope"
    llm_model: str = "qwen3.5-plus"
    llm_api_key: str = ""
    llm_base_url: str = "https://coding.dashscope.aliyuncs.com/v1"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 2048

    # Embedding
    embedding_provider: str = "local"
    embedding_model: str = "BAAI/bge-small-zh-v1.5"
    embedding_api_key: str = ""
    embedding_base_url: str = ""
    embedding_dimension: int = 512

    # Ollama
    ollama_enabled: bool = False
    ollama_base_url: str = "http://127.0.0.1:11435/v1"
    ollama_model: str = "qwen2.5:3b"

    # JWT
    jwt_secret_key: str = ""
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    # 服务端口
    backend_port: int = 8000
    frontend_port: int = 3000

    @property
    def database_url(self) -> str:
        if self.db_backend == "sqlite":
            db_path = _ROOT / "data" / "xin_ai.db"
            db_path.parent.mkdir(parents=True, exist_ok=True)
            return f"sqlite+aiosqlite:///{db_path}"
        return (
            f"mysql+aiomysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            "?charset=utf8mb4"
        )

    @property
    def sync_database_url(self) -> str:
        if self.db_backend == "sqlite":
            db_path = _ROOT / "data" / "xin_ai.db"
            return f"sqlite:///{db_path}"
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            "?charset=utf8mb4"
        )

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return (
                f"redis://:{self.redis_password}"
                f"@{self.redis_host}:{self.redis_port}/{self.redis_db}"
            )
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
