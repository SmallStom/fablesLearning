"""全局异常捕获中间件"""

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback
import sentry_sdk


async def error_handler(request: Request, exc: Exception):
    """捕获未处理的异常，返回友好错误信息"""
    traceback.print_exc()
    # 上报到 Sentry
    sentry_sdk.capture_exception(exc)
    return JSONResponse(
        status_code=500,
        content={"data": None, "error": "服务器内部错误"},
    )
