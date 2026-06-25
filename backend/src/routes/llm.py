"""LLM 代理路由（非流式对话 + 配置管理）"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from src.middleware.auth import get_current_user
from src.lib.supabase_client import get_supabase
from src.lib.llm_proxy import LLMConfig, chat_completion
from src.lib.encryption import encrypt, decrypt
from src.config import settings
from src.lib.limiter import limiter

router = APIRouter(prefix="/api/llm", tags=["LLM"])


class ChatRequest(BaseModel):
    systemPrompt: str
    userPrompt: str
    maxTokens: int = 500
    temperature: float = 0.5


class LLMConfigRequest(BaseModel):
    baseURL: str = ""
    apiKey: str = ""
    model: str = ""
    usePlatformLLM: bool = True


@router.get("/config")
async def get_config(user: dict = Depends(get_current_user)):
    """获取用户 LLM 配置（API Key 不返回明文）"""
    sb = get_supabase()
    result = sb.table("user_llm_configs").select("*").eq("user_id", user["id"]).maybe_single().execute()
    row = result.data if result and hasattr(result, 'data') else None
    if not row:
        return {"data": {"baseURL": "", "apiKey": "", "model": "", "usePlatformLLM": True}}
    return {"data": {
        "baseURL": row.get("base_url", ""),
        "apiKey": "",  # 不返回明文
        "model": row.get("model", ""),
        "usePlatformLLM": row.get("use_platform_llm", True),
    }}


@router.put("/config")
async def set_config(req: LLMConfigRequest, user: dict = Depends(get_current_user)):
    """保存用户 LLM 配置（API Key 加密存储）"""
    sb = get_supabase()
    data = {
        "user_id": user["id"],
        "base_url": req.baseURL,
        "model": req.model,
        "use_platform_llm": req.usePlatformLLM,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # 仅当提供了新 apiKey 时才更新（避免覆盖已有 Key）
    if req.apiKey:
        data["api_key_encrypted"] = encrypt(req.apiKey)
    sb.table("user_llm_configs").upsert(data, on_conflict="user_id").execute()
    return {"data": {"status": "ok"}}


@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, req: ChatRequest, user: dict = Depends(get_current_user)):
    """非流式 LLM 对话代理"""
    sb = get_supabase()
    llm_row_data = None
    llm_result = sb.table("user_llm_configs").select("*").eq("user_id", user["id"]).maybe_single().execute()
    if llm_result and hasattr(llm_result, 'data'):
        llm_row_data = llm_result.data

    if llm_row_data and not llm_row_data.get("use_platform_llm", True) and llm_row_data.get("base_url"):
        config = LLMConfig(
            base_url=llm_row_data["base_url"],
            api_key=decrypt(llm_row_data.get("api_key_encrypted", "")),
            model=llm_row_data.get("model", ""),
        )
    else:
        config = LLMConfig(
            base_url=settings.platform_llm_base_url,
            api_key=settings.platform_llm_api_key,
            model=settings.platform_llm_model,
        )

    try:
        content = await chat_completion(
            config, req.systemPrompt, req.userPrompt,
            max_tokens=req.maxTokens, temperature=req.temperature,
        )
        return {"data": {"content": content}}
    except Exception as e:
        raise HTTPException(500, f"LLM 调用失败：{str(e)}")
