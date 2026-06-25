"""JWT 认证中间件（FastAPI 依赖注入）"""

from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
from typing import Optional
import httpx
import time

from src.config import settings

# JWKS 缓存
_jwks_keys: dict | None = None
_jwks_fetched_at: float = 0
_JWKS_TTL = 3600  # 1 小时缓存


def _get_jwks() -> dict:
    """从 Supabase 获取 JWKS 公钥（带缓存）"""
    global _jwks_keys, _jwks_fetched_at
    now = time.time()
    if _jwks_keys and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_keys

    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(jwks_url, timeout=10)
    resp.raise_for_status()
    _jwks_keys = resp.json()
    _jwks_fetched_at = now
    return _jwks_keys


async def get_current_user(request: Request) -> dict:
    """
    从 Authorization header 提取 Bearer token，验证 JWT，返回用户信息。
    支持 HS256（旧版 Supabase）和 ES256（新版 Supabase EC 签名）。
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供认证信息",
        )

    token = auth_header[7:]  # 去掉 "Bearer "

    try:
        # 从 token header 获取算法
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")

        if alg == "HS256":
            # 旧版 Supabase HMAC 签名
            if not settings.jwt_secret:
                raise JWTError("JWT_SECRET not configured for HS256")
            payload = jwt.decode(
                token,
                settings.jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        else:
            # 新版 Supabase EC 签名（ES256 等），用 JWKS 公钥验证
            jwks = _get_jwks()
            kid = unverified_header.get("kid")
            key = None
            for k in jwks.get("keys", []):
                if kid and k.get("kid") == kid:
                    key = k
                    break
                # 无 kid 时按 alg 匹配
                if not kid and k.get("alg") == alg:
                    key = k
                    break
            if key is None:
                raise JWTError(f"Unable to find matching JWKS key for alg={alg}, kid={kid}")
            payload = jwt.decode(
                token,
                key,
                algorithms=[alg],
                options={"verify_aud": False},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证信息",
            )
        return {
            "id": user_id,
            "email": payload.get("email", ""),
            "username": payload.get("user_metadata", {}).get("username", ""),
        }
    except JWTError as e:
        import sys
        print(f"JWT验证失败: {e}", file=sys.stderr)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证已过期，请重新登录",
        )
