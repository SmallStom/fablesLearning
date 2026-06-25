import { getSystemPrompt } from '@/data/worlds';
import type { WorldMemoryEntry } from '@/types';

/** 风格维度定义 */
const NARRATIVE_PERSPECTIVES = [
  '第三人称有限视角（紧贴一个角色的感知）',
  '第三人称全知视角（可在角色间切换）',
  '第一人称（用"我"叙述，角色从世界观角色群中选）',
  '器物/非人类视角（一件物品、一只动物、一棵植物的自述）',
  '旁观者视角（一个边缘角色观察核心事件）',
];

const TONES = [
  '冷峻克制，少用形容词，靠动作和对话推进',
  '温情细腻，注意感官细节和情绪层次',
  '黑色幽默，用反讽和荒诞感包裹深意',
  '白描式，像新闻纪实一样冷静客观',
  '诗化叙事，意象密度高但不过度抒情',
];

const STRUCTURES = [
  '单场景集中叙事（一个时间一个地点）',
  '碎片拼贴（两三个短场景交叉剪辑）',
  '时间线性推进，但中间有一次回溯',
  '从结尾倒叙，先给结果再还原过程',
  '平行叙事（两条线索同时推进，最后交汇）',
];

const OPENINGS = [
  '从一个具体动作开始',
  '从一段对话开始',
  '从一个环境细节/声音开始',
  '从角色的内心活动开始',
  '从一个反常的微小变化开始',
];

/** 随机选一项 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 生成随机风格提示 */
function buildStyleHint(): string {
  const parts = [
    `叙事视角：${pick(NARRATIVE_PERSPECTIVES)}`,
    `语言基调：${pick(TONES)}`,
    `结构方式：${pick(STRUCTURES)}`,
    `开头方式：${pick(OPENINGS)}`,
  ];
  return parts.join('；\n');
}

/**
 * 从世界记忆构建"世界纪事"——Agent 记忆机制的核心
 * 智能压缩：最近 5 条完整输出，更早的压缩为单行摘要
 * 总量上限 20 条（最近 5 + 旧摘要 15），防止 prompt 膨胀
 */
function buildWorldChronicle(memories: WorldMemoryEntry[]): string {
  if (memories.length === 0) return '';

  // 记忆按时间正序（旧→新）
  const chronological = [...memories].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 总量上限：取最近 20 条
  const capped = chronological.slice(-20);

  const RECENT_COUNT = 5;
  const recent = capped.slice(-RECENT_COUNT);
  const older = capped.slice(0, -RECENT_COUNT);

  const lines: string[] = [];

  // 旧记忆压缩为单行
  if (older.length > 0) {
    lines.push('【早期纪事（摘要）】');
    for (const m of older) {
      const date = new Date(m.timestamp).toLocaleDateString('zh-CN');
      const chars = m.charactersInvolved.length > 0
        ? `（${m.charactersInvolved.join('、')}）`
        : '';
      lines.push(`- [${date}] 「${m.conceptName || m.concept}」${chars}：${m.storySummary}`);
    }
    lines.push('');
  }

  // 近期记忆完整输出
  if (recent.length > 0) {
    lines.push('【近期纪事（完整）】');
    for (const m of recent) {
      const date = new Date(m.timestamp).toLocaleDateString('zh-CN');
      lines.push(`◆ [${date}] 概念「${m.conceptName || m.concept}」`);
      lines.push(`  故事摘要：${m.storySummary}`);
      if (m.charactersInvolved.length > 0) {
        lines.push(`  出场角色：${m.charactersInvolved.join('、')}`);
      }
      if (m.worldChanges) {
        lines.push(`  世界变化：${m.worldChanges}`);
      }
      lines.push('');
    }
  }

  return `这个世界里已经发生过以下故事，新故事应当与之衔接——可以引用前事、让角色因过往事件而成长、让世界产生可见的变化。但不要简单重复已讲过的情节，世界在生长，不是循环：\n\n${lines.join('\n').trim()}`;
}

/**
 * 组装完整的 LLM 请求参数
 * @param worldId 世界 ID
 * @param concept 概念名
 * @param memories 该世界的世界记忆（全量）
 */
export function buildFablePrompt(
  worldId: string,
  concept: string,
  memories?: WorldMemoryEntry[]
): { systemPrompt: string; userPrompt: string } {
  let systemPrompt = getSystemPrompt(worldId);
  // 替换占位符（使用函数替换避免 $ 模式注入）
  systemPrompt = systemPrompt.replace(/\{concept\}/g, () => concept);

  // 注入世界纪事（Agent 记忆）
  const chronicle = memories ? buildWorldChronicle(memories) : '';
  systemPrompt = systemPrompt.replace(/\{worldChronicle\}/g, () => chronicle);

  // 注入随机风格
  const styleHint = buildStyleHint();
  systemPrompt = systemPrompt.replace(/\{styleHint\}/g, () => styleHint);

  const userPrompt = `请围绕"${concept}"这个概念，写一则寓言。`;

  return { systemPrompt, userPrompt };
}
