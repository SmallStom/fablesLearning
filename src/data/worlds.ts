import type { WorldMeta } from '@/types';

// 构建时动态发现所有世界（新增 worlds/xxx/ 文件夹即自动生效，无需硬编码）
const worldJsonModules = import.meta.glob('/worlds/*/world.json', {
  eager: true,
  import: 'default',
}) as Record<string, WorldMeta>;

const promptModules = import.meta.glob('/worlds/*/system-prompt.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const sampleModules = import.meta.glob('/worlds/*/sample-fable.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function idFromPath(path: string): string | undefined {
  return path.match(/\/worlds\/(.+?)\//)?.[1];
}

/** 所有世界元信息（构建时发现） */
export const ALL_WORLDS: WorldMeta[] = Object.entries(worldJsonModules)
  .map(([path, data]) => ({ ...(data as object), id: idFromPath(path)! }))
  .filter((w) => w.id) as WorldMeta[];

export const WORLD_IDS: string[] = ALL_WORLDS.map((w) => w.id);

/** 获取单个世界元信息 */
export function getWorldMeta(worldId: string): WorldMeta | undefined {
  return ALL_WORLDS.find((w) => w.id === worldId);
}

/** 获取某世界的 system prompt（构建时已打包） */
export function getSystemPrompt(worldId: string): string {
  const entry = Object.entries(promptModules).find(
    ([p]) => idFromPath(p) === worldId
  );
  return entry?.[1] ?? '';
}

/** 获取某世界的示例寓言（仅部分世界有） */
export function getSampleFable(worldId: string): string | undefined {
  const entry = Object.entries(sampleModules).find(
    ([p]) => idFromPath(p) === worldId
  );
  return entry?.[1];
}
