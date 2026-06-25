"""Prompt 构建器：从 TypeScript 版本移植，用 pathlib 读取世界文件"""

import json
import random
import functools
from datetime import datetime
from pathlib import Path

from src.config import settings


# ========== 风格维度定义 ==========

NARRATIVE_PERSPECTIVES = [
    '第三人称有限视角（紧贴一个角色的感知）',
    '第三人称全知视角（可在角色间切换）',
    '第一人称（用"我"叙述，角色从世界观角色群中选）',
    '器物/非人类视角（一件物品、一只动物、一棵植物的自述）',
    '旁观者视角（一个边缘角色观察核心事件）',
]

TONES = [
    '冷峻克制，少用形容词，靠动作和对话推进',
    '温情细腻，注意感官细节和情绪层次',
    '黑色幽默，用反讽和荒诞感包裹深意',
    '白描式，像新闻纪实一样冷静客观',
    '诗化叙事，意象密度高但不过度抒情',
]

STRUCTURES = [
    '单场景集中叙事（一个时间一个地点）',
    '碎片拼贴（两三个短场景交叉剪辑）',
    '时间线性推进，但中间有一次回溯',
    '从结尾倒叙，先给结果再还原过程',
    '平行叙事（两条线索同时推进，最后交汇）',
]

OPENINGS = [
    '从一个具体动作开始',
    '从一段对话开始',
    '从一个环境细节/声音开始',
    '从角色的内心活动开始',
    '从一个反常的微小变化开始',
]


def build_style_hint() -> str:
    """生成随机风格提示，从 4 个维度各随机选一项"""
    parts = [
        f'叙事视角：{random.choice(NARRATIVE_PERSPECTIVES)}',
        f'语言基调：{random.choice(TONES)}',
        f'结构方式：{random.choice(STRUCTURES)}',
        f'开头方式：{random.choice(OPENINGS)}',
    ]
    return '；\n'.join(parts)


def _parse_timestamp(timestamp: str) -> float:
    """解析时间戳为可比较的浮点数"""
    try:
        ts = timestamp.replace('Z', '+00:00')
        dt = datetime.fromisoformat(ts)
        return dt.timestamp()
    except (ValueError, TypeError):
        return 0.0


def _format_date(timestamp: str) -> str:
    """格式化日期为 zh-CN 风格（YYYY/M/D，无前导零）"""
    try:
        ts = timestamp.replace('Z', '+00:00')
        dt = datetime.fromisoformat(ts)
        return f'{dt.year}/{dt.month}/{dt.day}'
    except (ValueError, TypeError):
        return timestamp


def build_world_chronicle(memories: list) -> str:
    """
    从世界记忆构建"世界纪事"——Agent 记忆机制的核心
    智能压缩：最近 5 条完整输出，更早的压缩为单行摘要
    总量上限 20 条（最近 5 + 旧摘要 15），防止 prompt 膨胀
    """
    if len(memories) == 0:
        return ''

    # 记忆按时间正序（旧→新）
    chronological = sorted(memories, key=lambda m: _parse_timestamp(m.get('timestamp', '')))

    # 总量上限：取最近 20 条
    capped = chronological[-20:]

    RECENT_COUNT = 5
    recent = capped[-RECENT_COUNT:]
    older = capped[:-RECENT_COUNT]

    lines = []

    # 旧记忆压缩为单行
    if len(older) > 0:
        lines.append('【早期纪事（摘要）】')
        for m in older:
            date = _format_date(m.get('timestamp', ''))
            chars_involved = m.get('charactersInvolved', [])
            chars = f'（{"、".join(chars_involved)}）' if chars_involved else ''
            concept_name = m.get('conceptName') or m.get('concept', '')
            lines.append(f'- [{date}] 「{concept_name}」{chars}：{m.get("storySummary", "")}')
        lines.append('')

    # 近期记忆完整输出
    if len(recent) > 0:
        lines.append('【近期纪事（完整）】')
        for m in recent:
            date = _format_date(m.get('timestamp', ''))
            concept_name = m.get('conceptName') or m.get('concept', '')
            lines.append(f'◆ [{date}] 概念「{concept_name}」')
            lines.append(f'  故事摘要：{m.get("storySummary", "")}')
            chars_involved = m.get('charactersInvolved', [])
            if chars_involved:
                lines.append(f'  出场角色：{"、".join(chars_involved)}')
            world_changes = m.get('worldChanges', '')
            if world_changes:
                lines.append(f'  世界变化：{world_changes}')
            lines.append('')

    chronicle_body = '\n'.join(lines).strip()
    return (
        '这个世界里已经发生过以下故事，新故事应当与之衔接——'
        '可以引用前事、让角色因过往事件而成长、让世界产生可见的变化。'
        '但不要简单重复已讲过的情节，世界在生长，不是循环：\n\n'
        + chronicle_body
    )


def _validate_world_id(world_id: str) -> bool:
    """防止路径遍历"""
    return '..' not in world_id and '/' not in world_id and '\\' not in world_id


@functools.lru_cache(maxsize=32)
def get_system_prompt(world_id: str) -> str:
    """读取指定世界的 system-prompt.md"""
    if not _validate_world_id(world_id):
        return ''
    path: Path = settings.worlds_dir / world_id / 'system-prompt.md'
    if path.exists():
        return path.read_text(encoding='utf-8')
    return ''


@functools.lru_cache(maxsize=32)
def get_world_meta(world_id: str) -> dict | None:
    """读取指定世界的 world.json 元数据"""
    if not _validate_world_id(world_id):
        return None
    path: Path = settings.worlds_dir / world_id / 'world.json'
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    return None


def build_fable_prompt(
    world_id: str,
    concept: str,
    memories: list | None = None,
) -> dict:
    """
    组装完整的 LLM 请求参数
    :param world_id: 世界 ID
    :param concept: 概念名
    :param memories: 该世界的世界记忆（全量）
    :return: {'systemPrompt': str, 'userPrompt': str}
    """
    system_prompt = get_system_prompt(world_id)
    # 替换占位符（Python str.replace 是字面替换，无 $ 模式注入风险）
    system_prompt = system_prompt.replace('{concept}', concept)

    # 注入世界纪事（Agent 记忆）
    chronicle = build_world_chronicle(memories) if memories else ''
    system_prompt = system_prompt.replace('{worldChronicle}', chronicle)

    # 注入随机风格
    style_hint = build_style_hint()
    system_prompt = system_prompt.replace('{styleHint}', style_hint)

    user_prompt = f'请围绕"{concept}"这个概念，写一则寓言。'

    # 追加强制的 JSON 输出指令
    json_instruction = f'''

## 五、强制输出格式（JSON）

你必须用中文回答，并且只输出一个合法的 JSON 对象，不要输出 markdown 代码块标记（```json）。JSON 结构如下：

{{
  "content": "寓言正文，800-1000字，只讲故事本身，不要解释概念",
  "conceptName": "{concept}",
  "conceptDefinition": "对概念的完整解释：包括定义、所属领域/学科、核心含义、特点和重要性。必须是一段实质性说明文字，不能只写概念名。",
  "mappings": [
    {{"storyElement": "故事中的具体元素", "conceptPart": "对应的概念组成部分"}}
  ],
  "understandingQuestion": "一个具体的理解检验问题，不能是空泛的'你怎么看'",
  "transferQuestion": "一个具体的迁移检验问题，要求举其他领域的例子",
  "memoryEntry": {{
    "storySummary": "用一两句话概括故事",
    "charactersInvolved": ["角色1", "角色2"],
    "worldChanges": "这个故事对世界产生了什么影响"
  }}
}}

检查清单：
- conceptDefinition 字段必须包含完整定义说明，不能只写"{concept}"两个字。
- understandingQuestion 和 transferQuestion 必须包含具体问题文字。
- content 字段只包含故事正文，不要混入解析文字。
'''

    system_prompt = system_prompt + json_instruction

    return {'systemPrompt': system_prompt, 'userPrompt': user_prompt}
