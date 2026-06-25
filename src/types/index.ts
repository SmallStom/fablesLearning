// ========== 世界定义 ==========

export interface WorldTheme {
  primary: string;
  secondary: string;
  background: string;
  textPrimary: string;
  cardBg: string;
}

export interface WorldMeta {
  id: string;
  name: string;
  tagline: string;
  category: string;
  icon: string;
  description: string;
  demoConcept: string;
  theme: WorldTheme;
}

// ========== 寓言结果 ==========

export interface FableMapping {
  storyElement: string;
  conceptPart: string;
}

export interface FableResult {
  id: string;
  concept: string;
  worldId: string;
  worldName: string;
  content: string;
  conceptName: string;
  conceptDefinition: string;
  mappings: FableMapping[];
  quiz: {
    understanding: string;
    transfer: string;
  };
  createdAt: string;
}

// ========== LLM 配置 ==========

export interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  usePlatformLLM: boolean;
}

// ========== 认证与通用 API ==========

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

// ========== 世界记忆（Agent 记忆机制） ==========

export interface WorldMemoryEntry {
  fableId: string;
  concept: string;
  conceptName: string;
  timestamp: string;
  storySummary: string;
  charactersInvolved: string[];
  worldChanges: string;
}
