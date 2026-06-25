"""解析 LLM 输出为结构化寓言：从 TypeScript 版本移植"""

import json
import re


# ========== 标题匹配正则（容错：支持多种标题变体）==========

# 匹配"概念解析"部分的开头标题
ANALYSIS_HEADING = re.compile(r'\n(?:#{1,6}\s*)?(?:第[二2]部分[：:]?)?\s*\*{0,2}概念解析\*{0,2}')

# 匹配"检验问题"部分的开头标题
QUIZ_HEADING = re.compile(r'\n(?:#{1,6}\s*)?(?:第[三3]部分[：:]?)?\s*\*{0,2}检验问题\*{0,2}')

# 匹配"世界记忆"部分的开头标题
MEMORY_HEADING = re.compile(r'\n(?:#{1,6}\s*)?(?:第[四4]部分[：:]?)?\s*\*{0,2}世界记忆\*{0,2}')

# 分隔符正则：--- 或 ——— 等（3 个以上的破折号/连字符）
DASH_SEPARATOR = re.compile(r'\n[—-]{3,}\n')

# 引号字符类：ASCII 双引号、中文左右双引号、单引号
_QUOTE_CLASS = '["\u201c\u201d\']'


def _extract_json(raw: str) -> dict | None:
    """从原始文本中提取 JSON 对象"""
    # 尝试整个文本作为 JSON
    raw_stripped = raw.strip()
    # 去掉可能的 markdown 代码块
    if raw_stripped.startswith('```'):
        raw_stripped = re.sub(r'^```(?:json)?\s*', '', raw_stripped, flags=re.IGNORECASE)
        raw_stripped = re.sub(r'\s*```\s*$', '', raw_stripped)
    try:
        return json.loads(raw_stripped)
    except json.JSONDecodeError:
        pass

    # 尝试匹配 ```json ... ``` 代码块
    code_block_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw, re.IGNORECASE)
    if code_block_match:
        try:
            return json.loads(code_block_match.group(1))
        except json.JSONDecodeError:
            pass

    # 尝试匹配 { ... } 最外层对象
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start:end + 1])
        except json.JSONDecodeError:
            pass

    return None


def strip_leading_heading(text: str) -> str:
    """去除开头的"### 第一部分：寓言正文"之类标题行"""
    return re.sub(r'^\s*(?:#{1,6}\s*)?第?[一1]部分[：:][^\n]*\n+', '', text, count=1).strip()


def extract_story_body(raw: str) -> str:
    """
    从原始（可能不完整的）文本中提取故事正文部分
    用于流式输出时只显示故事，隐藏概念解析、检验问题和世界记忆
    """
    # 如果是 JSON 输出，直接取 content
    parsed = _extract_json(raw)
    if parsed and isinstance(parsed, dict) and parsed.get('content'):
        return parsed['content'].strip()

    # 按 --- 分隔符分割
    dash_match = DASH_SEPARATOR.search(raw)
    if dash_match:
        return strip_leading_heading(raw[:dash_match.start()])

    # 按 概念解析 标题分割
    heading_match = ANALYSIS_HEADING.search(raw)
    if heading_match:
        return strip_leading_heading(raw[:heading_match.start()])

    return strip_leading_heading(raw)


def parse_concept_line(section: str) -> dict:
    """从概念解析段落中提取概念名和说明全文"""
    cleaned = re.sub(r'\*\*', '', section)

    name_match = re.search(
        r'概念[：:]\s*' + _QUOTE_CLASS + r'?(.+?)' + _QUOTE_CLASS + r'?(?:[，,。.\n]|$)',
        cleaned,
    )
    name = name_match.group(1).strip() if name_match else ''

    concept_match = re.search(r'概念[：:]', cleaned)
    if concept_match:
        concept_idx = concept_match.start()
        after_concept = cleaned[concept_idx:]
        mapping_match = re.search(r'\n\s*(?:\d+[.、）)]\s*)?故事映射', after_concept)
        if mapping_match:
            concept_para = after_concept[:mapping_match.start()]
        else:
            concept_para = after_concept
        definition = re.sub(r'^概念[：:]\s*[^，,\n]*[，,]?\s*', '', concept_para, count=1).strip()
        if definition:
            return {'name': name, 'definition': definition}

    return {'name': name, 'definition': ''}


def parse_mappings(section: str) -> list:
    """提取映射列表"""
    mappings = []
    for match in re.finditer(r'[-•]\s*(.+?)\s*[→>]\s*(.+?)(?:\n|$)', section):
        mappings.append({
            'storyElement': match.group(1).strip(),
            'conceptPart': match.group(2).strip(),
        })
    return mappings


def parse_questions(section: str) -> list:
    """提取编号问题列表"""
    questions = []
    for match in re.finditer(r'\d+[.、）)]\s*([\s\S]+?)(?=\n\d+[.、）)]|\n*$)', section):
        questions.append(match.group(1).strip())
    return questions


def parse_memory_entry(section: str, concept: str, concept_name: str) -> dict | None:
    """从"世界记忆"段落中提取记忆条目"""
    if not section or not section.strip():
        return None

    cleaned = re.sub(r'\*\*', '', section)
    cleaned = re.sub(
        r'^#{1,6}\s*(?:第[四4]部分[：:]?)?\s*世界记忆\s*',
        '',
        cleaned,
        flags=re.IGNORECASE,
    ).strip()

    story_summary = ''
    summary_match = re.search(
        r'故事摘要[：:]\s*([\s\S]+?)(?:\n出场角色[：:]|\n世界变化[：:]|\n*$)',
        cleaned,
    )
    if summary_match:
        story_summary = summary_match.group(1).strip()

    characters_involved = []
    chars_match = re.search(r'出场角色[：:]\s*(.+?)(?:\n世界变化[：:]|\n*$)', cleaned)
    if chars_match:
        characters_involved = [
            c for c in re.split(r'[、，,\s]+', chars_match.group(1).strip()) if c
        ]

    world_changes = ''
    changes_match = re.search(r'世界变化[：:]\s*([\s\S]+?)(?:\n*$)', cleaned)
    if changes_match:
        world_changes = changes_match.group(1).strip()

    if not story_summary and not world_changes:
        story_summary = cleaned[:200].strip()

    if not story_summary and not world_changes and len(characters_involved) == 0:
        return None

    return {
        'concept': concept,
        'conceptName': concept_name,
        'storySummary': story_summary,
        'charactersInvolved': characters_involved,
        'worldChanges': world_changes,
    }


def _parse_json_fable(parsed: dict, concept: str | None) -> dict:
    """从 JSON 对象构建 fable 结构"""
    concept_name = (parsed.get('conceptName') or concept or '').strip()
    concept_definition = (parsed.get('conceptDefinition') or '').strip()

    # 确保概念名被包含在定义里
    if concept_name and concept_definition and concept_name not in concept_definition:
        concept_definition = f"{concept_name}：{concept_definition}"

    mappings = []
    for m in parsed.get('mappings') or []:
        if isinstance(m, dict):
            mappings.append({
                'storyElement': str(m.get('storyElement', '')).strip(),
                'conceptPart': str(m.get('conceptPart', '')).strip(),
            })

    memory_raw = parsed.get('memoryEntry') or {}
    if isinstance(memory_raw, dict):
        memory_entry = {
            'concept': concept if concept else concept_name,
            'conceptName': concept_name,
            'storySummary': str(memory_raw.get('storySummary', '')).strip(),
            'charactersInvolved': memory_raw.get('charactersInvolved') or [],
            'worldChanges': str(memory_raw.get('worldChanges', '')).strip(),
        }
    else:
        memory_entry = None

    return {
        'content': (parsed.get('content') or '').strip(),
        'conceptName': concept_name,
        'conceptDefinition': concept_definition,
        'mappings': mappings,
        'understandingQuestion': str(parsed.get('understandingQuestion', '')).strip(),
        'transferQuestion': str(parsed.get('transferQuestion', '')).strip(),
        'memoryEntry': memory_entry,
    }


def parse_fable_response(raw: str, concept: str | None = None) -> dict | None:
    """
    解析 LLM 输出为结构化寓言
    优先尝试 JSON 输出；失败则回退到旧的分割解析
    """
    if not raw or not raw.strip():
        return None

    # 优先 JSON 解析
    parsed_json = _extract_json(raw)
    if parsed_json and isinstance(parsed_json, dict):
        return _parse_json_fable(parsed_json, concept)

    # 回退：按 --- 或标题分割
    content = ''
    analysis_section = ''
    quiz_section = ''
    memory_section = ''

    parts = DASH_SEPARATOR.split(raw)
    if len(parts) >= 4:
        content = strip_leading_heading(parts[0])
        analysis_section = '\n---\n'.join(parts[1:-2]).strip()
        quiz_section = parts[-2].strip()
        memory_section = parts[-1].strip()
    elif len(parts) >= 3:
        content = strip_leading_heading(parts[0])
        analysis_section = '\n---\n'.join(parts[1:-1]).strip()
        quiz_section = parts[-1].strip()
        mem_match = MEMORY_HEADING.search(quiz_section)
        if mem_match:
            memory_section = quiz_section[mem_match.start():].strip()
            quiz_section = quiz_section[:mem_match.start()].strip()
    elif len(parts) == 2:
        content = strip_leading_heading(parts[0])
        analysis_section = parts[1].strip()
    else:
        analysis_match = ANALYSIS_HEADING.search(raw)
        quiz_match = QUIZ_HEADING.search(raw)
        mem_match = MEMORY_HEADING.search(raw)

        analysis_idx = analysis_match.start() if analysis_match else -1
        quiz_idx = quiz_match.start() if quiz_match else -1
        mem_idx = mem_match.start() if mem_match else -1

        if analysis_idx != -1 and quiz_idx != -1 and mem_idx != -1:
            if quiz_idx > analysis_idx and mem_idx > quiz_idx:
                content = strip_leading_heading(raw[:analysis_idx])
                analysis_section = raw[analysis_idx:quiz_idx].strip()
                quiz_section = raw[quiz_idx:mem_idx].strip()
                memory_section = raw[mem_idx:].strip()
        elif analysis_idx != -1 and quiz_idx != -1 and quiz_idx > analysis_idx:
            content = strip_leading_heading(raw[:analysis_idx])
            analysis_section = raw[analysis_idx:quiz_idx].strip()
            quiz_section = raw[quiz_idx:].strip()
        elif analysis_idx != -1:
            content = strip_leading_heading(raw[:analysis_idx])
            analysis_section = raw[analysis_idx:].strip()
        else:
            content = strip_leading_heading(raw)

    result = parse_concept_line(analysis_section)
    concept_name = result['name'] or (concept or '')
    concept_definition = result['definition']
    mappings = parse_mappings(analysis_section)
    questions = parse_questions(quiz_section)
    memory_entry = parse_memory_entry(
        memory_section,
        concept if concept else concept_name,
        concept_name,
    )

    return {
        'content': content,
        'conceptName': concept_name,
        'conceptDefinition': concept_definition,
        'mappings': mappings,
        'understandingQuestion': questions[0] if questions else '',
        'transferQuestion': questions[1] if len(questions) > 1 else '',
        'memoryEntry': memory_entry,
    }
