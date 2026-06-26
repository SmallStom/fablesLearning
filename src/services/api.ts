import type { ApiResponse } from '@/types';

/** 后端基础地址：优先读取环境变量，默认本地 8000 端口 */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** 拼接请求 URL：自动处理 BASE_URL 尾斜杠与 path 首斜杠 */
function buildUrl(path: string): string {
  const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  return `${base}${path}`;
}

/** 认证 token 在 sessionStorage 中的 key（与 auth.ts 保持一致） */
const TOKEN_KEY = 'worldview_token';

/** 读取当前 token */
export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 401 失效后清理认证信息并跳转登录页（仅触发一次，避免并发重复跳转） */
let redirecting = false;
function handleUnauthorized(): void {
  if (redirecting) return;
  redirecting = true;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('worldview_user');
  } catch {
    /* ignore */
  }
  // 重置 zustand 认证状态（通过事件通知 store）
  window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  // 使用 hash 路由跳转，兼容 HashRouter
  window.location.hash = '#/login';
  // 稍后重置标志，允许后续再次触发
  setTimeout(() => {
    redirecting = false;
  }, 1000);
}

/** 把后端返回的英文/原始错误信息转成友好的中文提示 */
function friendlyMessage(status: number, raw: string): string {
  if (status === 401) return '登录已过期，请重新登录';
  if (status === 403) return '没有权限执行此操作';
  if (status === 404) return '请求的资源不存在';
  if (status >= 500) return '服务器开小差了，请稍后再试';
  return raw || '请求失败，请稍后重试';
}

/** 统一构建请求头，自动附带 Authorization */
function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** 请求拦截：在这里可以对请求做统一加工（如打日志），目前直接透传 */
function requestInterceptor(url: string, init: RequestInit): { url: string; init: RequestInit } {
  return { url, init };
}

/**
 * 响应拦截：解析 ApiResponse<T>，失败时抛出带中文信息的 Error
 * 约定后端 JSON 接口统一返回 { data: T; error?: string }
 */
async function responseInterceptor<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(friendlyMessage(401, ''));
  }

  // 无 body 或非 JSON（如 204），直接返回空对象
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(friendlyMessage(res.status, ''));
    return {} as T;
  }

  const payload = (await res.json()) as ApiResponse<T> | T;

  if (!res.ok) {
    const errMsg =
      (payload as ApiResponse<T>)?.error ||
      (typeof payload === 'string' ? payload : '') ||
      '';
    throw new Error(friendlyMessage(res.status, errMsg));
  }

  // 兼容两种返回：包裹在 { data } 中，或直接返回数据
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in (payload as ApiResponse<T>) &&
    (payload as ApiResponse<T>).data !== undefined
  ) {
    const wrapped = payload as ApiResponse<T>;
    if (wrapped.error) throw new Error(wrapped.error);
    return wrapped.data;
  }
  return payload as T;
}

/** 核心 fetch 封装 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal; headers?: Record<string, string> }
): Promise<T> {
  const url = buildUrl(path);
  const init: RequestInit = {
    method,
    headers: buildHeaders(options?.headers),
    signal: options?.signal,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const { url: finalUrl, init: finalInit } = requestInterceptor(url, init);

  try {
    const res = await fetch(finalUrl, finalInit);
    return await responseInterceptor<T>(res);
  } catch (e) {
    // 网络错误（fetch 抛 TypeError）
    if (e instanceof TypeError || (e instanceof Error && e.message.includes('fetch'))) {
      throw new Error('网络连接失败，请检查网络后重试');
    }
    throw e;
  }
}

/** GET 请求 */
export function apiGet<T>(
  path: string,
  options?: { signal?: AbortSignal }
): Promise<T> {
  return request<T>('GET', path, undefined, options);
}

/**
 * 公开 GET 请求：不携带 Authorization，401 时不自动跳转登录页。
 * 用于分享页等无需登录的公开接口。
 */
export async function publicGet<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const url = buildUrl(path);
  const init: RequestInit = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: options?.signal,
  };
  try {
    const res = await fetch(url, init);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(friendlyMessage(res.status, '分享内容不存在或已失效'));
      }
      const contentType = res.headers.get('content-type') || '';
      let errMsg = '';
      if (contentType.includes('application/json')) {
        const payload = (await res.json()) as ApiResponse<T> | T;
        errMsg =
          (payload as ApiResponse<T>)?.error ||
          (typeof payload === 'string' ? payload : '') ||
          '';
      }
      throw new Error(friendlyMessage(res.status, errMsg));
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {} as T;
    }
    const payload = (await res.json()) as ApiResponse<T> | T;
    if (
      payload &&
      typeof payload === 'object' &&
      'data' in (payload as ApiResponse<T>) &&
      (payload as ApiResponse<T>).data !== undefined
    ) {
      const wrapped = payload as ApiResponse<T>;
      if (wrapped.error) throw new Error(wrapped.error);
      return wrapped.data;
    }
    return payload as T;
  } catch (e) {
    // 网络错误（fetch 抛错）时给出友好提示
    if (e instanceof TypeError || (e instanceof Error && e.message.includes('fetch'))) {
      throw new Error('加载失败，请检查网络连接');
    }
    throw e;
  }
}

/** POST 请求 */
export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal }
): Promise<T> {
  return request<T>('POST', path, body, options);
}

/** PUT 请求 */
export function apiPut<T>(
  path: string,
  body?: unknown,
  options?: { signal?: AbortSignal }
): Promise<T> {
  return request<T>('PUT', path, body, options);
}

/** DELETE 请求 */
export function apiDelete<T>(
  path: string,
  options?: { signal?: AbortSignal }
): Promise<T> {
  return request<T>('DELETE', path, undefined, options);
}

/**
 * 流式请求（SSE）：用于后端流式返回（如寓言生成）。
 * 自动附带 Authorization，返回可读取的 ReadableStream。
 * 失败时（含 401）抛出带中文信息的 Error。
 */
export async function apiStream(
  path: string,
  body: unknown,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({ Accept: 'text/event-stream' }),
    body: JSON.stringify(body),
    signal,
  });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error(friendlyMessage(401, ''));
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(friendlyMessage(res.status, text.slice(0, 200)));
  }
  if (!res.body) {
    throw new Error('服务器未返回流式响应');
  }
  return res.body;
}
