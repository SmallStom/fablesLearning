"""认证路由"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional
from supabase import Client
from src.lib.supabase_client import get_supabase
from src.middleware.auth import get_current_user
from src.lib.limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["认证"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    avatar: str = "👤"


@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, req: RegisterRequest):
    """注册"""
    # 密码强度检查
    if len(req.password) < 8:
        raise HTTPException(400, "密码至少需要 8 位")
    sb = get_supabase()
    try:
        result = sb.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {"data": {"username": req.username}}
        })
        if not result.user:
            raise HTTPException(400, "注册失败，请检查邮箱格式")
        # profile 由数据库触发器自动创建，使用 upsert 防止冲突
        sb.table("profiles").upsert({
            "id": result.user.id,
            "username": req.username,
            "avatar": "👤",
        }, on_conflict="id").execute()
        # session 可能为 None（开启邮箱验证时）
        if result.session:
            token = result.session.access_token
            return {"data": {"token": token, "user": {"id": result.user.id, "email": req.email, "username": req.username, "avatar": "👤"}}}
        # 需要邮箱验证
        return {"data": {"token": "", "user": {"id": result.user.id, "email": req.email, "username": req.username, "avatar": "👤"}, "needVerification": True}}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(400, f"注册失败：{str(e)}")


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, req: LoginRequest):
    """登录"""
    sb = get_supabase()
    try:
        result = sb.auth.sign_in_with_password({"email": req.email, "password": req.password})
        if not result.user:
            raise HTTPException(401, "邮箱或密码错误")
        # 获取 profile（用 maybe_single 避免 .single() 抛异常）
        profile = sb.table("profiles").select("*").eq("id", result.user.id).maybe_single().execute()
        username = profile.data.get("username", "") if profile.data else ""
        avatar = profile.data.get("avatar", "👤") if profile.data else "👤"
        token = result.session.access_token
        return {"data": {"token": token, "user": {"id": result.user.id, "email": req.email, "username": username, "avatar": avatar}}}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "邮箱或密码错误")


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    """登出"""
    sb = get_supabase()
    try:
        sb.auth.sign_out()
    except Exception:
        pass
    return {"data": {"status": "ok"}}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """当前用户信息"""
    sb = get_supabase()
    profile = sb.table("profiles").select("*").eq("id", user["id"]).maybe_single().execute()
    return {"data": {"id": user["id"], "email": user["email"], "username": profile.data.get("username", "") if profile.data else "", "avatar": profile.data.get("avatar", "👤") if profile.data else "👤"}}
