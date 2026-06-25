import { create } from 'zustand';
import type { User } from '@/types';
import * as auth from '@/services/auth';
import { migrateLocalData } from '@/utils/migrateLocalData';
import { trackEvent } from '@/lib/analytics';
import { setUser } from '@/lib/sentry';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  /** 登录 */
  login: (email: string, password: string) => Promise<void>;
  /** 注册 */
  register: (email: string, password: string, username: string) => Promise<void>;
  /** 退出登录 */
  logout: () => Promise<void>;
  /** 从 sessionStorage 恢复登录态 */
  loadFromStorage: () => void;
}

// 模块加载时同步读取 sessionStorage，保证首屏即恢复登录态
const initialToken = auth.getToken();
const initialUser = auth.loadUser();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!(initialToken && initialUser),

  login: async (email, password) => {
    const data = await auth.login(email, password);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    setUser({ id: data.user.id, email: data.user.email, username: data.user.username });
    trackEvent('login', { method: 'email' });
    // 首次登录后自动迁移本地旧数据到后端（失败不影响登录）
    void migrateLocalData().catch(() => {
      /* 迁移失败静默处理 */
    });
  },

  register: async (email, password, username) => {
    const data = await auth.register(email, password, username);
    // 注册可能返回空 token（Supabase 开启邮箱验证时），此时不设为已认证
    if (data.token) {
      set({ user: data.user, token: data.token, isAuthenticated: true });
      setUser({ id: data.user.id, email: data.user.email, username: data.user.username });
      trackEvent('register', { method: 'email' });
      // 新注册用户通常无旧数据，仍尝试迁移（幂等）
      void migrateLocalData().catch(() => {
        /* ignore */
      });
    } else {
      // token 为空，说明需要邮箱验证，不设置登录态
      set({ user: null, token: null, isAuthenticated: false });
      throw new Error('注册成功，请验证邮箱后登录');
    }
  },

  logout: async () => {
    await auth.logout();
    set({ user: null, token: null, isAuthenticated: false });
    setUser(null);
    trackEvent('logout');
  },

  loadFromStorage: () => {
    const token = auth.getToken();
    const user = auth.loadUser();
    if (token && user) {
      set({ user, token, isAuthenticated: true });
      setUser({ id: user.id, email: user.email, username: user.username });
    }
  },
}));

// 监听 401 事件，同步重置 zustand 认证状态
if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });
}
