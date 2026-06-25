import { request } from '@playwright/test';

/**
 * 检查后端 API 是否可访问。
 * 用于决定是否跳过依赖后端服务的 E2E 测试。
 */
export async function isBackendReachable(): Promise<boolean> {
  const apiUrl = process.env.VITE_API_URL || 'http://localhost:8000';
  try {
    const ctx = await request.newContext({ timeout: 3000 });
    const res = await ctx.get(`${apiUrl}/api/health`);
    return res.ok();
  } catch {
    return false;
  }
}
