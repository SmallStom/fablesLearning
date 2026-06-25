import { describe, it, expect } from 'vitest';
import { parseFableResponse, extractStoryBody } from './parseResponse';

const SAMPLE_FABLE = `小鹿推开便利店的门，手机横在掌心，正在播她自己今晚的直播回放。

她手指在屏幕上拖进度条——她要找三小时四十二分那一段。

---

概念解析

1. **概念**："活人感"，属于互联网文化/社交媒体研究领域。2025年入选《咬文嚼字》十大流行语。核心定义是：在社交媒体或生活中呈现出真实、自然、不刻意修饰的状态——有瑕疵、有情绪、有即兴反应，像活生生的人，而非按脚本运行的 NPC 或 AI。

2. **故事映射**：
- 小鹿看自己的直播回放 → 职业主播对自我呈现的持续监控
- 小夏说"你刚才说'嗯'的时候" → 最简单、最不设防的一个字被旁观者判定为最优
- 结尾不跺脚 → 唯一没被任何人观察到的行为选择

---

检验问题

1. **理解检验**：小夏为什么偏偏挑中了一个"嗯"字？
2. **迁移检验**：你在工作或生活中，有没有某个时刻突然意识到自己正在"表演自然"？

---

世界记忆

- 故事摘要：小鹿在便利店遇到小夏，意识到自己最自然的瞬间是未被表演的那个"嗯"。
- 出场角色：小鹿、小夏
- 世界变化：便利店多了一位常客开始观察自己的声音。
`;

describe('parseFableResponse', () => {
  it('能解析完整寓言为结构化数据', () => {
    const result = parseFableResponse(SAMPLE_FABLE, '活人感');
    expect(result).not.toBeNull();

    expect(result!.content).toContain('小鹿推开便利店的门');
    expect(result!.content).not.toContain('概念解析');

    expect(result!.conceptName).toBe('活人感');
    expect(result!.conceptDefinition).toContain('真实、自然、不刻意修饰的状态');

    expect(result!.mappings.length).toBeGreaterThanOrEqual(2);
    expect(result!.mappings[0]).toHaveProperty('storyElement');
    expect(result!.mappings[0]).toHaveProperty('conceptPart');

    expect(result!.understandingQuestion).toContain('理解检验');
    expect(result!.transferQuestion).toContain('迁移检验');

    expect(result!.memoryEntry).not.toBeNull();
    expect(result!.memoryEntry!.storySummary).toContain('小鹿');
    expect(result!.memoryEntry!.charactersInvolved).toContain('小鹿');
  });

  it('空字符串返回 null', () => {
    expect(parseFableResponse('')).toBeNull();
    expect(parseFableResponse('   ')).toBeNull();
  });

  it('只有正文时也能解析', () => {
    const raw = '这是一个没有分段的寓言故事。';
    const result = parseFableResponse(raw);
    expect(result).not.toBeNull();
    expect(result!.content).toBe(raw);
    expect(result!.conceptName).toBe('');
  });
});

describe('extractStoryBody', () => {
  it('按分隔符提取正文', () => {
    const body = extractStoryBody(SAMPLE_FABLE);
    expect(body).toContain('小鹿推开便利店的门');
    expect(body).not.toContain('概念解析');
  });

  it('无分隔符时返回整个文本去掉标题', () => {
    expect(extractStoryBody('只有正文')).toBe('只有正文');
  });
});
