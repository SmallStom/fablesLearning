"""FastAPI 应用入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.config import settings
from src.middleware.error_handler import error_handler
from src.lib.sentry_init import init_sentry
from src.lib.limiter import limiter

# 初始化 Sentry（未配置 DSN 时静默跳过）
init_sentry()

from src.routes import auth, fables, quiz, worlds, memories, user, llm, share

app = FastAPI(
    title="世界观 API",
    version="0.1.0",
    docs_url="/api/docs" if settings.environment != "production" else None,
    redoc_url="/api/redoc" if settings.environment != "production" else None,
    openapi_url="/api/openapi.json" if settings.environment != "production" else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 配置（开发环境允许所有 localhost 端口）
_cors_origins = [
    settings.frontend_url,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 注册全局异常处理器
app.add_exception_handler(Exception, error_handler)

# 注册路由
app.include_router(auth.router)
app.include_router(fables.router)
app.include_router(quiz.router)
app.include_router(worlds.router)
app.include_router(memories.router)
app.include_router(user.router)
app.include_router(llm.router)
app.include_router(share.router)


@app.get("/api/health")
async def health():
    """健康检查"""
    return {"data": {"status": "ok"}}
