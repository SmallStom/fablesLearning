"""测验评判路由"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.middleware.auth import get_current_user
from src.lib.supabase_client import get_supabase
from src.lib.llm_proxy import LLMConfig, chat_completion
from src.lib.encryption import decrypt
from src.config import settings

router = APIRouter(prefix="/api/quiz", tags=["测验"])


class JudgeRequest(BaseModel):
    fableId: str
    questionKey: str
    answer: str
    question: str
    label: str = ""
    conceptName: str = ""
    content: str = ""
    conceptDefinition: str = ""


@router.post("/judge")
async def judge(req: JudgeRequest, user: dict = Depends(get_current_user)):
    """AI 评判学生作答"""
    sb = get_supabase()

    # 获取 LLM 配置
    llm_result = sb.table("user_llm_configs").select("*").eq("user_id", user["id"]).maybe_single().execute()
    llm_data = llm_result.data if llm_result and hasattr(llm_result, 'data') else None
    if llm_data and not llm_data.get("use_platform_llm", True) and llm_data.get("base_url"):
        config = LLMConfig(
            base_url=llm_data["base_url"],
            api_key=decrypt(llm_data.get("api_key_encrypted", "")),
            model=llm_data.get("model", ""),
        )
    else:
        config = LLMConfig(
            base_url=settings.platform_llm_base_url,
            api_key=settings.platform_llm_api_key,
            model=settings.platform_llm_model,
        )

    system_prompt = f'''你是一个学习导师。学生刚通过一则寓言学习了"{req.conceptName}"这个概念。
寓言故事摘要：{req.content[:500]}
概念定义：{req.conceptDefinition}

现在学生回答了一道检验题，请你：
1. 判断学生是否真正理解了概念核心（不要只看表面故事情节）
2. 指出回答中正确的部分和不足之处
3. 如果有偏差，简要纠正
回复用中文，200字以内，语气鼓励但诚实。'''

    user_prompt = f"【{req.label}】\n问题：{req.question}\n学生的回答：{req.answer}"

    try:
        feedback = await chat_completion(config, system_prompt, user_prompt, max_tokens=500, temperature=0.5)

        # 存储作答
        sb.table("quiz_answers").upsert({
            "user_id": user["id"],
            "fable_id": req.fableId,
            "question_key": req.questionKey,
            "answer": req.answer,
            "feedback": feedback,
        }, on_conflict="user_id,fable_id,question_key").execute()

        return {"data": {"feedback": feedback}}
    except Exception as e:
        raise HTTPException(500, f"评判失败：{str(e)}")
