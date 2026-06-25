"""公开分享路由（无需认证）"""

import json
from fastapi import APIRouter, HTTPException
from src.lib.supabase_client import get_supabase
from src.config import settings

router = APIRouter(prefix="/api/share", tags=["分享"])


def _load_world_meta(world_id: str):
    """从 worlds 目录加载单个世界的元信息（name / icon 等）"""
    world_json = settings.worlds_dir / world_id / "world.json"
    if not world_json.exists():
        return None
    try:
        return json.loads(world_json.read_text(encoding="utf-8"))
    except Exception:
        return None


@router.get("/{token}")
async def get_shared_fable(token: str):
    """通过分享 token 获取寓言内容（公开访问，无需登录）"""
    sb = get_supabase()
    result = (
        sb.table("fables")
        .select("*")
        .eq("share_token", token)
        .eq("is_shared", True)
        .maybe_single()
        .execute()
    )

    if not result.data:
        raise HTTPException(404, "分享内容不存在或已被取消")

    row = result.data

    # 从 worlds 目录补充世界名称和图标
    world_meta = _load_world_meta(row.get("world_id", ""))
    world_name = row.get("world_name", "") or (world_meta or {}).get("name", "")
    world_icon = (world_meta or {}).get("icon", "🌍")

    return {
        "data": {
            "concept": row.get("concept", ""),
            "conceptName": row.get("concept_name", ""),
            "conceptDefinition": row.get("concept_definition", ""),
            "content": row.get("content", ""),
            "worldName": world_name,
            "worldIcon": world_icon,
            "mappings": row.get("mappings", []),
            "createdAt": row.get("created_at", ""),
        }
    }
