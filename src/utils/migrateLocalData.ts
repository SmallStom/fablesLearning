import { apiPost, apiPut } from '@/services/api';
import type { FableResult, WorldMemoryEntry, LLMConfig } from '@/types';

// 旧的（无租户前缀）localStorage key
const OLD_HISTORY_KEY = 'worldview_history';
const OLD_ENABLED_WORLDS_KEY = 'worldview_enabled_worlds';
const OLD_LLM_CONFIG_KEY = 'worldview_llm_config';
const OLD_WORLD_MEMORIES_KEY = 'worldview_world_memories';

/** 安全读取并解析 localStorage 中的 JSON */
function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export interface MigrateResult {
  migrated: boolean;
  history: number;
  memories: number;
  enabledWorlds: boolean;
  llmConfig: boolean;
}

/**
 * 将 localStorage 中的旧数据（无租户前缀的 worldview_* key）迁移到后端。
 * - 历史记录 → POST /api/fables
 * - 世界记忆 → POST /api/memories/{worldId}
 * - 启用世界 → PUT /api/worlds/enabled
 * - LLM 配置 → PUT /api/llm/config
 * 迁移成功后清理对应的旧 key。整个过程幂等：旧 key 不存在时直接跳过。
 */
export async function migrateLocalData(): Promise<MigrateResult> {
  const result: MigrateResult = {
    migrated: false,
    history: 0,
    memories: 0,
    enabledWorlds: false,
    llmConfig: false,
  };

  // 1. 迁移历史记录
  const oldHistory = readJSON<FableResult[]>(OLD_HISTORY_KEY);
  if (oldHistory && Array.isArray(oldHistory) && oldHistory.length > 0) {
    for (const fable of oldHistory) {
      try {
        await apiPost('/api/fables', fable);
        result.history += 1;
      } catch {
        /* 单条失败跳过，继续迁移其余 */
      }
    }
    if (result.history > 0) {
      localStorage.removeItem(OLD_HISTORY_KEY);
      result.migrated = true;
    }
  }

  // 2. 迁移世界记忆
  const oldMemories = readJSON<Record<string, WorldMemoryEntry[]>>(OLD_WORLD_MEMORIES_KEY);
  if (oldMemories && typeof oldMemories === 'object') {
    let memCount = 0;
    for (const [worldId, entries] of Object.entries(oldMemories)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        try {
          await apiPost(`/api/memories/${encodeURIComponent(worldId)}`, entry);
          memCount += 1;
        } catch {
          /* ignore */
        }
      }
    }
    if (memCount > 0) {
      localStorage.removeItem(OLD_WORLD_MEMORIES_KEY);
      result.memories = memCount;
      result.migrated = true;
    }
  }

  // 3. 迁移启用的世界列表
  const oldEnabled = readJSON<string[]>(OLD_ENABLED_WORLDS_KEY);
  if (oldEnabled && Array.isArray(oldEnabled)) {
    try {
      await apiPut('/api/worlds/enabled', { enabled: oldEnabled });
      localStorage.removeItem(OLD_ENABLED_WORLDS_KEY);
      result.enabledWorlds = true;
      result.migrated = true;
    } catch {
      /* ignore */
    }
  }

  // 4. 迁移 LLM 配置
  const oldLLMConfig = readJSON<LLMConfig>(OLD_LLM_CONFIG_KEY);
  if (oldLLMConfig && oldLLMConfig.baseURL) {
    try {
      await apiPut('/api/llm/config', {
        ...oldLLMConfig,
        usePlatformLLM: false,
      });
      localStorage.removeItem(OLD_LLM_CONFIG_KEY);
      result.llmConfig = true;
      result.migrated = true;
    } catch {
      /* ignore */
    }
  }

  return result;
}
