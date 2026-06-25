"""世界记忆路由"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.middleware.auth import get_current_user
from src.lib.supabase_client import get_supabase

router = APIRouter(prefix="/api/memories", tags=["世界记忆"])


class MemoryEntry(BaseModel):
    concept: str = ""
    conceptName: str = ""
    storySummary: str = ""
    charactersInvolved: list = []
    worldChanges: str = ""
    fableId: Optional[str] = None
    timestamp: Optional[str] = None


@router.get("/{world_id}")
async def get_memories(world_id: str, user: dict = Depends(get_current_user)):
    """获取指定世界的世界记忆"""
    sb = get_supabase()
    result = sb.table("world_memories").select("*").eq("user_id", user["id"]).eq("world_id", world_id).order("created_at", desc=False).limit(100).execute()
    memories = []
    for row in result.data or []:
        memories.append({
            "fableId": row.get("fable_id", ""),
            "concept": row.get("concept", ""),
            "conceptName": row.get("concept_name", ""),
            "storySummary": row.get("story_summary", ""),
            "charactersInvolved": row.get("characters_involved", []),
            "worldChanges": row.get("world_changes", ""),
            "timestamp": row.get("created_at", ""),
        })
    return {"data": memories}


@router.post("/{world_id}")
async def add_memory(world_id: str, entry: MemoryEntry, user: dict = Depends(get_current_user)):
    """添加世界记忆"""
    sb = get_supabase()
    sb.table("world_memories").insert({
        "user_id": user["id"],
        "world_id": world_id,
        "fable_id": entry.fableId,
        "concept": entry.concept,
        "concept_name": entry.conceptName,
        "story_summary": entry.storySummary,
        "characters_involved": entry.charactersInvolved,
        "world_changes": entry.worldChanges,
    }).execute()
    return {"data": {"status": "ok"}}


@router.delete("/{world_id}")
async def clear_memories(world_id: str, user: dict = Depends(get_current_user)):
    """清空指定世界的世界记忆"""
    sb = get_supabase()
    sb.table("world_memories").delete().eq("user_id", user["id"]).eq("world_id", world_id).execute()
    return {"data": {"status": "ok"}}
