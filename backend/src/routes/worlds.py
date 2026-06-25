"""世界管理路由"""

import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.middleware.auth import get_current_user
from src.lib.supabase_client import get_supabase
from src.config import settings

router = APIRouter(prefix="/api/worlds", tags=["世界"])


class EnabledRequest(BaseModel):
    enabled: list


def _load_worlds_meta():
    """从 worlds/ 目录加载所有世界元信息"""
    worlds = []
    worlds_dir = settings.worlds_dir
    if not worlds_dir.exists():
        return worlds
    for world_json in sorted(worlds_dir.glob("*/world.json")):
        try:
            data = json.loads(world_json.read_text(encoding="utf-8"))
            world_id = world_json.parent.name
            data["id"] = world_id
            worlds.append(data)
        except Exception:
            continue
    return worlds


@router.get("")
async def list_worlds():
    """获取世界列表"""
    return {"data": _load_worlds_meta()}


@router.get("/enabled")
async def get_enabled_worlds(user: dict = Depends(get_current_user)):
    """获取用户已启用的世界"""
    sb = get_supabase()
    result = sb.table("user_worlds").select("world_id,enabled").eq("user_id", user["id"]).execute()
    enabled_ids = [r["world_id"] for r in (result.data or []) if r.get("enabled")]
    if not enabled_ids:
        # 首次使用，默认全部启用
        all_worlds = _load_worlds_meta()
        enabled_ids = [w["id"] for w in all_worlds]
    return {"data": {"enabled": enabled_ids}}


@router.put("/enabled")
async def set_enabled_worlds(req: EnabledRequest, user: dict = Depends(get_current_user)):
    """设置已启用的世界"""
    sb = get_supabase()
    # 获取当前已启用的世界
    result = sb.table("user_worlds").select("world_id").eq("user_id", user["id"]).execute()
    current_ids = {r["world_id"] for r in (result.data or [])}
    new_ids = set(req.enabled)
    # 删除取消的
    to_delete = current_ids - new_ids
    if to_delete:
        for wid in to_delete:
            sb.table("user_worlds").delete().eq("user_id", user["id"]).eq("world_id", wid).execute()
    # 插入新增的
    to_insert = new_ids - current_ids
    if to_insert:
        for wid in to_insert:
            sb.table("user_worlds").insert({
                "user_id": user["id"],
                "world_id": wid,
                "enabled": True,
            }).execute()
    return {"data": {"enabled": req.enabled}}


@router.get("/{world_id}")
async def get_world(world_id: str):
    """获取单个世界详情"""
    if '..' in world_id or '/' in world_id or '\\' in world_id:
        raise HTTPException(404, "世界不存在")
    world_json = settings.worlds_dir / world_id / "world.json"
    if not world_json.exists():
        raise HTTPException(404, "世界不存在")
    data = json.loads(world_json.read_text(encoding="utf-8"))
    data["id"] = world_id
    return {"data": data}
