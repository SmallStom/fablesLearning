"""应用配置：从环境变量读取所有配置项"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 项目根目录（tellme/）
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # JWT
    jwt_secret: str = os.getenv("JWT_SECRET", "")

    # 加密密钥（Fernet）
    encryption_key: str = os.getenv("ENCRYPTION_KEY", "")

    # 平台默认 LLM
    platform_llm_provider: str = os.getenv("PLATFORM_LLM_PROVIDER", "openai")
    platform_llm_base_url: str = os.getenv("PLATFORM_LLM_BASE_URL", "https://api.openai.com/v1")
    platform_llm_api_key: str = os.getenv("PLATFORM_LLM_API_KEY", "")
    platform_llm_model: str = os.getenv("PLATFORM_LLM_MODEL", "gpt-4o-mini")

    # CORS
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Sentry
    sentry_dsn: str = os.getenv("SENTRY_DSN", "")
    environment: str = os.getenv("ENVIRONMENT", "production")

    # worlds 目录路径
    worlds_dir: Path = PROJECT_ROOT / "worlds"

    class Config:
        env_file = ".env"


settings = Settings()
