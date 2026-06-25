import type { FableMapping, WorldMemoryEntry } from '@/types';

export interface ParsedFable {
  content: string;
  conceptName: string;
  conceptDefinition: string;
  mappings: FableMapping[];
  understandingQuestion: string;
  transferQuestion: string;
  memoryEntry: Omit<WorldMemoryEntry, 'fableId' | 'timestamp'> | null;
}

/**
 * 匹配"概念解析"部分的开头标题
 * 支持：### 第二部分：概念解析 / **概念解析** / ## 概念解析 / 概念解析
 */
const ANALYSIS_HEADING = /\n(?:#{1,6}\s*)?(?:第[二2]部分[：:]?)?\s*\*{0,2}概念解析\*{0,2}/;

/**
 * 匹配"检验问题"部分的开头标题
 * 支持：### 第三部分：检验问题 / **检验问题** / ## 检验问题 / 检验问题
 */
const QUIZ_HEADING = /\n(?:#{1,6}\s*)?(?:第[三3]部分[：:]?)?\s*\*{0,2}检验问题\*{0,2}/;

/**
 * 匹配"世界记忆"部分的开头标题
 * 支持：### 第四部分：世界记忆 / **世界记忆** / ## 世界记忆 / 世界记忆
 */
const MEMORY_HEADING = /\n(?:#{1,6}\s*)?(?:第[四4]部分[：:]?)?\s*\*{0,2}世界记忆\*{0,2}/;

/** 去除开头的"### 第一部分：寓言正文"之类标题行 */
function stripLeadingHeading(text: string): string {
  return text.replace(/^\s*(?:#{1,6}\s*)?第?[一1]部分[：:][^\n]*\n+/, '').trim();
}

/**
 * 从原始（可能不完整的）文本中提取故事正文部分
 * 用于流式输出时只显示故事，隐藏概念解析、检验问题和世界记忆
 */
export function extractStoryBody(raw: string): string {
  // 按 --- 分隔符分割
  const dashIdx = raw.search(/\n[—-]{3,}\n/);
  if (dashIdx !== -1) return stripLeadingHeading(raw.slice(0, dashIdx));

  // 按 概念解析 标题分割（含 ### 第二部分：概念解析 等）
  const headingIdx = raw.search(ANALYSIS_HEADING);
  if (headingIdx !== -1) return stripLeadingHeading(raw.slice(0, headingIdx));

  return stripLeadingHeading(raw);
}

/** 从概念解析段落中提取概念名和说明全文 */
function parseConceptLine(section: string): { name: string; definition: string } {
  // 去除 markdown 粗体标记，便于匹配
  const cleaned = section.replace(/\*\*/g, '');

  // 提取概念名：概念：X / 概念："X" / 1. 概念：X
  const nameMatch = cleaned.match(/概念[：:]\s*["""']?(.+?)["""']?(?:[，,。.\n]|$)/);
  const name = nameMatch?.[1]?.trim() ?? '';

  // 提取概念说明全文：从"概念："后到"故事映射"前
  const conceptIdx = cleaned.search(/概念[：:]/);
  if (conceptIdx !== -1) {
    const afterConcept = cleaned.slice(conceptIdx);
    const mappingIdx = afterConcept.search(/\n\s*(?:\d+[.、）)]\s*)?故事映射/);
    const conceptPara = mappingIdx !== -1
      ? afterConcept.slice(0, mappingIdx)
      : afterConcept;
    // 去掉"概念：XXX，"前缀，保留完整说明
    const definition = conceptPara
      .replace(/^概念[：:]\s*[^，,\n]*[，,]?\s*/, '')
      .trim();
    if (definition) return { name, definition };
  }

  return { name, definition: '' };
}

/** 提取映射列表 */
function parseMappings(section: string): FableMapping[] {
  const mappings: FableMapping[] = [];
  const regex = /[-•]\s*(.+?)\s*[→>]\s*(.+?)(?:\n|$)/g;
  let match;
  while ((match = regex.exec(section)) !== null) {
    mappings.push({
      storyElement: match[1].trim(),
      conceptPart: match[2].trim(),
    });
  }
  return mappings;
}

/** 提取编号问题列表 */
function parseQuestions(section: string): string[] {
  const questions: string[] = [];
  const regex = /\d+[.、）)]\s*([\s\S]+?)(?=\n\d+[.、）)]|\n*$)/g;
  let match;
  while ((match = regex.exec(section)) !== null) {
    questions.push(match[1].trim());
  }
  return questions;
}

/** 从"世界记忆"段落中提取记忆条目 */
function parseMemoryEntry(
  section: string,
  concept: string,
  conceptName: string
): Omit<WorldMemoryEntry, 'fableId' | 'timestamp'> | null {
  if (!section || !section.trim()) return null;

  const cleaned = section
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*(?:第[四4]部分[：:]?)?\s*世界记忆\s*/i, '')
    .replace(/^\s*[-•]\s*/gm, '') // 移除每行开头的 markdown 列表符号
    .trim();

  // 提取故事摘要
  let storySummary = '';
  const summaryMatch = cleaned.match(/故事摘要[：:]\s*([\s\S]+?)(?:\n出场角色[：:]|\n世界变化[：:]|\n*$)/);
  if (summaryMatch) {
    storySummary = summaryMatch[1].trim();
  }

  // 提取出场角色
  let charactersInvolved: string[] = [];
  const charsMatch = cleaned.match(/出场角色[：:]\s*(.+?)(?:\n世界变化[：:]|\n*$)/);
  if (charsMatch) {
    charactersInvolved = charsMatch[1].trim().split(/[、，,\s]+/).filter(Boolean);
  }

  // 提取世界变化
  let worldChanges = '';
  const changesMatch = cleaned.match(/世界变化[：:]\s*([\s\S]+?)(?:\n*$)/);
  if (changesMatch) {
    worldChanges = changesMatch[1].trim();
  }

  // 如果没有结构化提取到，用整段作为摘要
  if (!storySummary && !worldChanges) {
    storySummary = cleaned.slice(0, 200).trim();
  }

  if (!storySummary && !worldChanges && charactersInvolved.length === 0) return null;

  return {
    concept,
    conceptName,
    storySummary,
    charactersInvolved,
    worldChanges,
  };
}

/**
 * 解析 LLM 输出为结构化寓言
 * 期望格式：寓言正文 \n---\n 概念解析 \n---\n 检验问题 \n---\n 世界记忆
 * 容错：支持 ### 第一部分 / **概念解析** 等标题分割
 */
export function parseFableResponse(raw: string, concept?: string): ParsedFable | null {
  if (!raw || !raw.trim()) return null;

  let content = '';
  let analysisSection = '';
  let quizSection = '';
  let memorySection = '';

  // 优先按 --- 分割
  const parts = raw.split(/\n[—-]{3,}\n/);
  if (parts.length >= 4) {
    content = stripLeadingHeading(parts[0]);
    analysisSection = parts.slice(1, -2).join('\n---\n').trim();
    quizSection = parts[parts.length - 2].trim();
    memorySection = parts[parts.length - 1].trim();
  } else if (parts.length >= 3) {
    content = stripLeadingHeading(parts[0]);
    analysisSection = parts.slice(1, -1).join('\n---\n').trim();
    quizSection = parts[parts.length - 1].trim();
    // 尝试从 quizSection 中分割出 memorySection
    const memIdx = quizSection.search(MEMORY_HEADING);
    if (memIdx !== -1) {
      memorySection = quizSection.slice(memIdx).trim();
      quizSection = quizSection.slice(0, memIdx).trim();
    }
  } else if (parts.length === 2) {
    content = stripLeadingHeading(parts[0]);
    analysisSection = parts[1].trim();
  } else {
    // 容错：按标题分割
    const analysisIdx = raw.search(ANALYSIS_HEADING);
    const quizIdx = raw.search(QUIZ_HEADING);
    const memIdx = raw.search(MEMORY_HEADING);

    if (analysisIdx !== -1 && quizIdx !== -1 && memIdx !== -1) {
      // 三者都有
      if (quizIdx > analysisIdx && memIdx > quizIdx) {
        content = stripLeadingHeading(raw.slice(0, analysisIdx));
        analysisSection = raw.slice(analysisIdx, quizIdx).trim();
        quizSection = raw.slice(quizIdx, memIdx).trim();
        memorySection = raw.slice(memIdx).trim();
      }
    } else if (analysisIdx !== -1 && quizIdx !== -1 && quizIdx > analysisIdx) {
      content = stripLeadingHeading(raw.slice(0, analysisIdx));
      analysisSection = raw.slice(analysisIdx, quizIdx).trim();
      quizSection = raw.slice(quizIdx).trim();
    } else if (analysisIdx !== -1) {
      content = stripLeadingHeading(raw.slice(0, analysisIdx));
      analysisSection = raw.slice(analysisIdx).trim();
    } else {
      content = stripLeadingHeading(raw);
    }
  }

  const { name: conceptName, definition: conceptDefinition } = parseConceptLine(analysisSection);
  const mappings = parseMappings(analysisSection);
  const questions = parseQuestions(quizSection);
  const memoryEntry = parseMemoryEntry(memorySection, concept ?? conceptName, conceptName);

  return {
    content,
    conceptName,
    conceptDefinition,
    mappings,
    understandingQuestion: questions[0] ?? '',
    transferQuestion: questions[1] ?? '',
    memoryEntry,
  };
}
