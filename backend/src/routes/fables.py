"""寓言路由"""

import json
import uuid
import asyncio
import sys
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from src.middleware.auth import get_current_user
from src.lib.supabase_client import get_supabase
from src.lib.llm_proxy import LLMConfig, stream_chat_completion, clean_think_tags
from src.lib.prompt_builder import build_fable_prompt
from src.lib.parse_response import parse_fable_response
from src.config import settings
from src.lib.limiter import limiter

router = APIRouter(prefix="/api/fables", tags=["寓言"])


class GenerateRequest(BaseModel):
    worldId: str
    concept: str
    memories: list = []


class FableCreateRequest(BaseModel):
    id: Optional[str] = None
    concept: str
    worldId: str
    worldName: str = ""
    content: str
    conceptName: str = ""
    conceptDefinition: str = ""
    mappings: list = []
    quiz: dict = {}
    memoryEntry: Optional[dict] = None
    createdAt: Optional[str] = None


class _ContentExtractor:
    """增量从 JSON 流中提取 content 字段内容"""

    def __init__(self):
        self.buffer = ""
        self.in_content = False
        self.content_value_raw = ""
        self.sent_len = 0

    def feed(self, delta: str) -> str:
        """传入新的 delta，返回新增的可展示文本"""
        self.buffer += delta

        if not self.in_content:
            marker = '"content": "'
            idx = self.buffer.find(marker)
            if idx == -1:
                return ""
            self.in_content = True
            self.content_value_raw = self.buffer[idx + len(marker):]
        else:
            self.content_value_raw += delta

        # 找到 content 值的结尾：下一个未转义的 "
        raw = self.content_value_raw
        end_idx = -1
        i = 0
        while i < len(raw):
            ch = raw[i]
            if ch == '\\' and i + 1 < len(raw):
                i += 2
                continue
            if ch == '"':
                end_idx = i
                break
            i += 1

        if end_idx != -1:
            value_raw = raw[:end_idx]
        else:
            value_raw = raw

        try:
            decoded = json.loads('"' + value_raw + '"')
        except json.JSONDecodeError:
            # 可能末尾有未闭合转义，去掉最后一个反斜杠再试
            if value_raw.endswith('\\'):
                try:
                    decoded = json.loads('"' + value_raw[:-1] + '"')
                except json.JSONDecodeError:
                    return ""
            else:
                return ""

        if not isinstance(decoded, str):
            return ""

        new_text = decoded[self.sent_len:]
        self.sent_len = len(decoded)
        return new_text


@router.post("/generate")
@limiter.limit("10/minute")
async def generate(request: Request, req: GenerateRequest, user: dict = Depends(get_current_user)):
    """流式生成寓言（SSE）"""

    async def event_stream():
        try:
            # 构建提示词
            prompt_data = build_fable_prompt(req.worldId, req.concept, req.memories)
            system_prompt = prompt_data['systemPrompt']
            user_prompt = prompt_data['userPrompt']

            # 获取用户的 LLM 配置（或平台默认）
            sb = get_supabase()
            llm_result = sb.table("user_llm_configs").select("*").eq("user_id", user["id"]).maybe_single().execute()
            llm_data = llm_result.data if llm_result and hasattr(llm_result, 'data') else None
            
            if llm_data and not llm_data.get("use_platform_llm", True) and llm_data.get("base_url"):
                # 用户自带 Key（BYOK）
                from src.lib.encryption import decrypt
                config = LLMConfig(
                    base_url=llm_data["base_url"],
                    api_key=decrypt(llm_data.get("api_key_encrypted", "")),
                    model=llm_data.get("model", ""),
                )
            else:
                # 平台默认 LLM
                config = LLMConfig(
                    base_url=settings.platform_llm_base_url,
                    api_key=settings.platform_llm_api_key,
                    model=settings.platform_llm_model,
                )

            # 流式获取 LLM 输出，并实时提取 content 字段推给前端
            full_content = ""
            extractor = _ContentExtractor()

            async for delta in stream_chat_completion(config, system_prompt, user_prompt):
                full_content += delta
                new_text = extractor.feed(delta)
                if new_text:
                    yield f"data: {json.dumps({'delta': new_text})}\n\n"

            # 解析并存储
            cleaned = clean_think_tags(full_content)
            parsed = parse_fable_response(cleaned, req.concept)

            fable_id = str(uuid.uuid4())
            world_name = _get_world_name(req.worldId)
            fable_data = {
                "id": fable_id,
                "user_id": user["id"],
                "world_id": req.worldId,
                "world_name": world_name,
                "concept": req.concept,
                "concept_name": (parsed.get("conceptName") or "") if parsed else "",
                "concept_definition": (parsed.get("conceptDefinition") or "") if parsed else "",
                "content": (parsed.get("content") or cleaned) if parsed else cleaned,
                "mappings": parsed.get("mappings", []) if parsed else [],
                "quiz": {
                    "understanding": parsed.get("understandingQuestion", "") if parsed else "",
                    "transfer": parsed.get("transferQuestion", "") if parsed else "",
                },
                "memory_entry": parsed.get("memoryEntry") if parsed else None,
                "is_shared": False,
            }

            # 存入数据库，并获取 created_at
            insert_result = sb.table("fables").insert(fable_data).execute()
            created_at = insert_result.data[0].get("created_at", "") if insert_result.data else ""

            # 存世界记忆（失败不影响寓言结果）
            if parsed and parsed.get("memoryEntry"):
                try:
                    mem = parsed["memoryEntry"]
                    sb.table("world_memories").insert({
                        "user_id": user["id"],
                        "world_id": req.worldId,
                        "fable_id": fable_id,
                        "concept": req.concept,
                        "concept_name": parsed.get("conceptName", ""),
                        "story_summary": mem.get("storySummary", ""),
                        "characters_involved": mem.get("charactersInvolved", []),
                        "world_changes": mem.get("worldChanges", ""),
                    }).execute()
                except Exception:
                    pass  # 记忆写入失败不阻断寓言返回

            # 返回完整寓言数据
            fable_result = {
                "id": fable_id,
                "concept": req.concept,
                "worldId": req.worldId,
                "worldName": world_name,
                "content": fable_data["content"],
                "conceptName": fable_data["concept_name"],
                "conceptDefinition": fable_data["concept_definition"],
                "mappings": fable_data["mappings"],
                "quiz": fable_data["quiz"],
                "createdAt": created_at,
            }

            yield f"data: {json.dumps({'type': 'done', 'fable': fable_result})}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("")
async def list_fables(user: dict = Depends(get_current_user)):
    """获取寓言列表"""
    sb = get_supabase()
    result = sb.table("fables").select("*").eq("user_id", user["id"]).order("created_at", desc=True).limit(200).execute()
    fables = []
    for row in result.data or []:
        fables.append(_row_to_fable(row))
    return {"data": fables}


@router.post("")
async def create_fable(req: FableCreateRequest, user: dict = Depends(get_current_user)):
    """直接创建寓言（用于数据迁移）"""
    sb = get_supabase()
    fable_id = req.id or str(uuid.uuid4())
    insert_data = {
        "id": fable_id,
        "user_id": user["id"],
        "world_id": req.worldId,
        "world_name": req.worldName,
        "concept": req.concept,
        "concept_name": req.conceptName,
        "concept_definition": req.conceptDefinition,
        "content": req.content,
        "mappings": req.mappings,
        "quiz": req.quiz,
        "is_shared": False,
    }
    if req.createdAt:
        insert_data["created_at"] = req.createdAt
    sb.table("fables").insert(insert_data).execute()
    return {"data": {"id": fable_id, "status": "created"}}


@router.delete("")
async def clear_fables(user: dict = Depends(get_current_user)):
    """清空所有寓言"""
    sb = get_supabase()
    sb.table("fables").delete().eq("user_id", user["id"]).execute()
    return {"data": {"status": "ok"}}


@router.get("/{fable_id}")
async def get_fable(fable_id: str, user: dict = Depends(get_current_user)):
    """获取单条寓言"""
    sb = get_supabase()
    result = sb.table("fables").select("*").eq("id", fable_id).eq("user_id", user["id"]).maybe_single().execute()
    if not result.data:
        raise HTTPException(404, "寓言不存在")
    return {"data": _row_to_fable(result.data)}


@router.delete("/{fable_id}")
async def delete_fable(fable_id: str, user: dict = Depends(get_current_user)):
    """删除单条寓言"""
    sb = get_supabase()
    sb.table("fables").delete().eq("id", fable_id).eq("user_id", user["id"]).execute()
    return {"data": {"status": "ok"}}


@router.post("/{fable_id}/share")
async def share_fable(fable_id: str, user: dict = Depends(get_current_user)):
    """生成分享链接"""
    import secrets
    sb = get_supabase()
    token = secrets.token_urlsafe(16)
    result = sb.table("fables").update({"is_shared": True, "share_token": token}).eq("id", fable_id).eq("user_id", user["id"]).execute()
    if not result.data:
        raise HTTPException(404, "寓言不存在")
    return {"data": {"shareToken": token}}


def _get_world_name(world_id: str) -> str:
    """从 world.json 读取世界名称"""
    import json as _json
    # 防止路径遍历
    if '..' in world_id or '/' in world_id or '\\' in world_id:
        return ""
    world_json = settings.worlds_dir / world_id / "world.json"
    if world_json.exists():
        try:
            data = _json.loads(world_json.read_text(encoding="utf-8"))
            return data.get("name", "")
        except Exception:
            return ""
    return ""


def _row_to_fable(row: dict) -> dict:
    """将数据库行转换为前端 FableResult 格式"""
    return {
        "id": row["id"],
        "concept": row["concept"],
        "worldId": row["world_id"],
        "worldName": row.get("world_name", ""),
        "content": row["content"],
        "conceptName": row.get("concept_name", ""),
        "conceptDefinition": row.get("concept_definition", ""),
        "mappings": row.get("mappings", []),
        "quiz": row.get("quiz", {}),
        "createdAt": row.get("created_at", ""),
    }
