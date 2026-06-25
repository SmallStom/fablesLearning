"""Supabase 客户端"""

from supabase import create_client, Client
from src.config import settings

# 用 service_role_key 创建客户端（绕过 RLS，后端自行控制权限）
_client: Client | None = None


def get_supabase() -> Client:
    """获取 Supabase 客户端单例"""
    global _client
    if _client is None:
        _client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
    return _client
