import { apiPost, apiGet } from './api';
import type { User } from '@/types';

const TOKEN_KEY = 'worldview_token';
const USER_KEY = 'worldview_user';

/** 登录/注册接口的返回结构 */
interface AuthResponse {
  token: string;
  user: User;
}

// ========== token / 用户信息存储（sessionStorage） ==========

export function saveToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function saveUser(user: User): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

// ========== 认证服务 API ==========

/** 注册 */
export async function register(
  email: string,
  password: string,
  username: string
): Promise<AuthResponse> {
  const data = await apiPost<AuthResponse>('/api/auth/register', {
    email,
    password,
    username,
  });
  saveToken(data.token);
  saveUser(data.user);
  return data;
}

/** 登录 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await apiPost<AuthResponse>('/api/auth/login', {
    email,
    password,
  });
  saveToken(data.token);
  saveUser(data.user);
  return data;
}

/** 退出登录 */
export async function logout(): Promise<void> {
  try {
    await apiPost<void>('/api/auth/logout');
  } catch {
    // 即使后端退出失败，前端也清理本地状态
  }
  clearToken();
}

/** 获取当前登录用户信息 */
export async function getMe(): Promise<User> {
  return apiGet<User>('/api/auth/me');
}
