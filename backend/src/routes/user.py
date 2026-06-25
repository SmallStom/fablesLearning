"""用户资料和学习统计路由"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.middleware.auth import get_current_user
from src.lib.supabase_client import get_supabase

router = APIRouter(prefix="/api/user", tags=["用户"])


class ProfileUpdate(BaseModel):
    username: str = ""
    avatar: str = ""


@router.put("/profile")
async def update_profile(req: ProfileUpdate, user: dict = Depends(get_current_user)):
    """更新用户资料"""
    sb = get_supabase()
    updates = {}
    if req.username:
        updates["username"] = req.username
    if req.avatar:
        updates["avatar"] = req.avatar
    if updates:
        sb.table("profiles").update(updates).eq("id", user["id"]).execute()
    return {"data": {"status": "ok"}}


@router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    """学习统计"""
    from datetime import datetime, timedelta, timezone
    sb = get_supabase()
    # 总寓言数
    total = sb.table("fables").select("id", count="exact").eq("user_id", user["id"]).execute()
    # 各世界分布 + 最近30天每日计数
    all_fables = sb.table("fables").select("world_id,created_at").eq("user_id", user["id"]).order("created_at", desc=True).limit(500).execute()
    by_world = {}
    daily_counts = {}
    recent_7days = 0
    now_utc = datetime.now(timezone.utc)
    cutoff_7 = (now_utc - timedelta(days=7)).isoformat()
    cutoff_30 = (now_utc - timedelta(days=30)).strftime("%Y-%m-%d")
    for row in all_fables.data or []:
        wid = row.get("world_id", "unknown")
        by_world[wid] = by_world.get(wid, 0) + 1
        created = row.get("created_at", "")
        if created and created >= cutoff_7:
            recent_7days += 1
        date_str = created[:10] if created else ""
        if date_str >= cutoff_30:
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1
    return {"data": {
        "totalFables": total.count or 0,
        "byWorld": by_world,
        "recent7Days": recent_7days,
        "dailyCounts": daily_counts,
    }}
