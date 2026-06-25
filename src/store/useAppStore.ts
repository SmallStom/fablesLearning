import { create } from 'zustand';
import type { LLMConfig, FableResult, WorldMemoryEntry } from '@/types';
import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api';
import { WORLD_IDS } from '@/data/worlds';

// ========== Store 类型 ==========

interface AppState {
  // 当前会话状态
  currentWorldId: string | null;
  currentConcept: string;
  currentFable: FableResult | null;
  llmConfig: LLMConfig;
  history: FableResult[];
  enabledWorldIds: string[];
  worldMemories: Record<string, WorldMemoryEntry[]>;

  // 全局 UI 状态
  llmSettingsOpen: boolean;
  worldSettingsOpen: boolean;
  isGenerating: boolean;
  error: string | null;

  // 常规操作
  setCurrentWorld: (id: string | null) => void;
  setCurrentConcept: (c: string) => void;
  setCurrentFable: (f: FableResult | null) => void;
  setLLMConfig: (c: LLMConfig) => void;
  setLLMSettingsOpen: (open: boolean) => void;
  setWorldSettingsOpen: (open: boolean) => void;
  setIsGenerating: (g: boolean) => void;
  setError: (e: string | null) => void;

  // 历史记录（由后端 /api/fables/generate 落库，前端只需刷新）
  addToHistory: (f: FableResult) => void;
  clearHistory: () => Promise<void>;

  // 世界启用
  toggleWorld: (id: string) => void;
  setEnabledWorlds: (ids: string[]) => void;

  // 世界记忆
  addWorldMemory: (worldId: string, entry: WorldMemoryEntry) => void;
  getWorldMemory: (worldId: string) => WorldMemoryEntry[];
  clearWorldMemory: (worldId: string) => void;

  // 从后端异步加载
  loadHistory: () => Promise<void>;
  loadEnabledWorlds: () => Promise<void>;
  loadWorldMemories: (worldId?: string) => Promise<void>;
  loadLLMConfig: () => Promise<void>;
  /** 登录后一次性加载全部业务数据 */
  initializeAppData: () => Promise<void>;
}

// ========== 默认值 ==========

const DEFAULT_LLM_CONFIG: LLMConfig = {
  baseURL: '',
  apiKey: '',
  model: '',
  usePlatformLLM: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  currentWorldId: null,
  currentConcept: '',
  currentFable: null,
  llmConfig: DEFAULT_LLM_CONFIG,
  history: [],
  // 乐观默认：先展示全部世界，后端加载后覆盖为用户实际启用的列表
  enabledWorldIds: [...WORLD_IDS],
  worldMemories: {},

  llmSettingsOpen: false,
  worldSettingsOpen: false,
  isGenerating: false,
  error: null,

  // ===== 常规操作 =====

  setCurrentWorld: (id) =>
    set({ currentWorldId: id, error: null, currentFable: null }),

  setCurrentConcept: (c) => set({ currentConcept: c }),

  setCurrentFable: (f) => set({ currentFable: f }),

  setLLMConfig: (config) => {
    set({ llmConfig: config });
    // 持久化到后端，失败静默（前端状态已更新）
    apiPut('/api/llm/config', config).catch(() => {
      /* ignore */
    });
  },

  setLLMSettingsOpen: (open) => set({ llmSettingsOpen: open }),
  setWorldSettingsOpen: (open) => set({ worldSettingsOpen: open }),
  setIsGenerating: (g) => set({ isGenerating: g }),
  setError: (e) => set({ error: e }),

  // ===== 历史记录 =====

  // 寓言由后端 /api/fables/generate 落库，这里只需刷新列表
  addToHistory: () => {
    get().loadHistory().catch(() => {
      /* ignore */
    });
  },

  clearHistory: async () => {
    try {
      await apiDelete('/api/fables');
    } catch {
      /* ignore */
    }
    set({ history: [], currentFable: null });
  },

  // ===== 世界启用 =====

  toggleWorld: (id) => {
    const current = get().enabledWorldIds;
    const enabled = current.includes(id)
      ? current.filter((w) => w !== id)
      : [...current, id];
    set({ enabledWorldIds: enabled });
    // 持久化到后端，失败则回滚
    apiPut('/api/worlds/enabled', { enabled }).catch(() => {
      get().loadEnabledWorlds().catch(() => {
        /* ignore */
      });
    });
  },

  setEnabledWorlds: (ids) => {
    set({ enabledWorldIds: ids });
    apiPut('/api/worlds/enabled', { enabled: ids }).catch(() => {
      /* ignore */
    });
  },

  // ===== 世界记忆 =====

  addWorldMemory: (worldId, entry) => {
    // 先更新缓存，再落库
    const existing = get().worldMemories[worldId] ?? [];
    const memories = {
      ...get().worldMemories,
      [worldId]: [...existing, entry].slice(-100),
    };
    set({ worldMemories: memories });
    apiPost(`/api/memories/${encodeURIComponent(worldId)}`, entry).catch(() => {
      /* ignore */
    });
  },

  getWorldMemory: (worldId) => get().worldMemories[worldId] ?? [],

  clearWorldMemory: (worldId: string) => {
    set((state) => {
      const memories = { ...state.worldMemories };
      delete memories[worldId];
      return { worldMemories: memories };
    });
    apiDelete(`/api/memories/${encodeURIComponent(worldId)}`).catch(() => {
      /* ignore */
    });
  },

  // ===== 从后端加载 =====

  loadHistory: async () => {
    try {
      const data = await apiGet<FableResult[]>('/api/fables');
      set({ history: Array.isArray(data) ? data : [] });
    } catch {
      /* ignore */
    }
  },

  loadEnabledWorlds: async () => {
    try {
      const data = await apiGet<{ enabled: string[] } | string[]>('/api/worlds/enabled');
      const ids = Array.isArray(data)
        ? data
        : data?.enabled ?? [...WORLD_IDS];
      set({ enabledWorldIds: ids.filter((id) => WORLD_IDS.includes(id)) });
    } catch {
      /* ignore */
    }
  },

  loadWorldMemories: async (worldId) => {
    try {
      if (worldId) {
        const data = await apiGet<WorldMemoryEntry[]>(
          `/api/memories/${encodeURIComponent(worldId)}`
        );
        set((state) => ({
          worldMemories: {
            ...state.worldMemories,
            [worldId]: Array.isArray(data) ? data : [],
          },
        }));
      } else {
        // 未指定世界时，加载所有已启用世界的记忆
        const ids = get().enabledWorldIds;
        await Promise.all(ids.map((id) => get().loadWorldMemories(id)));
      }
    } catch {
      /* ignore */
    }
  },

  loadLLMConfig: async () => {
    try {
      const data = await apiGet<LLMConfig>('/api/llm/config');
      if (data) set({ llmConfig: { ...DEFAULT_LLM_CONFIG, ...data } });
    } catch {
      /* ignore */
    }
  },

  initializeAppData: async () => {
    await Promise.all([
      get().loadHistory(),
      get().loadEnabledWorlds(),
      get().loadLLMConfig(),
    ]);
  },
}));
