import type { LLMConfig, WorldMemoryEntry, FableResult } from '@/types';
import { apiPost, apiStream } from './api';

/** 预设模型选项（保留供 LLMSettings 选择） */
export const MODEL_PRESETS = [
  { label: 'GPT-4o mini', model: 'gpt-4o-mini', baseURL: 'https://api.openai.com/v1', apiKey: '' },
  { label: 'GPT-4o', model: 'gpt-4o', baseURL: 'https://api.openai.com/v1', apiKey: '' },
  { label: 'DeepSeek Chat', model: 'deepseek-chat', baseURL: 'https://api.deepseek.com/v1', apiKey: '' },
  { label: '通义千问 Plus', model: 'qwen-plus', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiKey: '' },
  { label: 'vLLM 本地部署', model: 'Qwen3-32B', baseURL: 'http://localhost:8012/v1', apiKey: 'EMPTY' },
];

/** 是否为本地部署 */
export function isLocalDeployment(config: LLMConfig): boolean {
  try {
    const parsed = new URL(config.baseURL);
    const host = parsed.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * 检查 LLM 是否可用。
 * 使用平台 LLM 时始终可用；BYOK 时需检查配置完整性。
 */
export function isLLMAvailable(config: LLMConfig): boolean {
  if (config.usePlatformLLM) return true;
  if (!config.baseURL || !config.model) return false;
  if (isLocalDeployment(config)) return true;
  return !!config.apiKey;
}

/** Qwen3 <think> 标签清理 */
function cleanThinkTags(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
}

/**
 * 测试 LLM 连通性：通过后端代理发送一条测试消息。
 * 调用前需确保配置已保存到后端。
 */
export async function testConnection(_config?: LLMConfig): Promise<boolean> {
  try {
    await apiPost<{ content: string }>('/api/llm/chat', {
      systemPrompt: '你是一个测试助手。',
      userPrompt: '请回复"连接成功"。',
      maxTokens: 20,
      temperature: 0,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 非流式对话（用于检验题评判等）。
 * 通过后端代理调用，由后端使用已保存的 LLM 配置。
 */
export async function chatCompletion(
  _config: LLMConfig,
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number; retries?: number; signal?: AbortSignal }
): Promise<string> {
  const maxRetries = options?.retries ?? 1;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60000);
    if (options?.signal?.aborted) controller.abort();
    const onAbort = () => controller.abort();
    if (options?.signal) options.signal.addEventListener('abort', onAbort, { once: true });

    try {
      const data = await apiPost<{ content: string }>(
        '/api/llm/chat',
        {
          systemPrompt,
          userPrompt,
          maxTokens: options?.maxTokens ?? 500,
          temperature: options?.temperature ?? 0.5,
        },
        { signal: controller.signal }
      );
      return cleanThinkTags(data.content ?? '');
    } catch (e) {
      lastError = e;
      if (controller.signal.aborted) throw e;
      if (attempt < maxRetries) {
        clearTimeout(timeoutId);
        await delay(1000 * (attempt + 1));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
      if (options?.signal) options.signal.removeEventListener('abort', onAbort);
    }
  }

  throw lastError ?? new Error('请求失败');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 流式生成寓言：调用后端 /api/fables/generate（SSE 流式）。
 * @param worldId 世界 ID
 * @param concept 概念名
 * @param memories 该世界的世界记忆（由后端用于构建 prompt）
 * @param onChunk 每收到一段文本时的回调（已清理 think 标签）
 * @param signal 可选的中断信号
 * @returns { raw: 完整原文, fable: 后端解析的寓言对象（可能为 null） }
 */
export async function streamFable(
  worldId: string,
  concept: string,
  memories: WorldMemoryEntry[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal
): Promise<{ raw: string; fable: FableResult | null }> {
  const stream = await apiStream(
    '/api/fables/generate',
    { worldId, concept, memories },
    signal
  );

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let lastCleaned = '';
  let doneFable: FableResult | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          // 检测 done 事件，提取后端解析的寓言数据
          if (json.type === 'done' && json.fable) {
            doneFable = json.fable as FableResult;
            continue;
          }
          if (json.error) {
            throw new Error(json.error);
          }
          const delta = json.delta ?? json.content ?? '';
          if (delta) {
            fullContent += delta;
            const cleanedFull = cleanThinkTags(fullContent);
            const newDelta = cleanedFull.slice(lastCleaned.length);
            lastCleaned = cleanedFull;
            if (newDelta) onChunk(newDelta);
          }
        } catch (e) {
          // 如果是已知的错误，向上抛出
          if (e instanceof Error && e.message && !e.message.includes('JSON')) {
            throw e;
          }
          // 非 JSON：当作纯文本增量
          const delta = data;
          fullContent += delta;
          const cleanedFull = cleanThinkTags(fullContent);
          const newDelta = cleanedFull.slice(lastCleaned.length);
          lastCleaned = cleanedFull;
          if (newDelta) onChunk(newDelta);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { raw: cleanThinkTags(fullContent), fable: doneFable };
}
