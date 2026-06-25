"""Sentry 后端初始化"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from src.config import settings


def init_sentry():
    """初始化 Sentry 后端监控。未配置 DSN 时静默跳过。"""
    dsn = getattr(settings, 'sentry_dsn', None) or ''
    if not dsn:
        return

    sentry_sdk.init(
        dsn=dsn,
        integrations=[
            StarletteIntegration(),
            FastApiIntegration(),
        ],
        traces_sample_rate=0.1,
        environment=getattr(settings, 'environment', 'production'),
    )
