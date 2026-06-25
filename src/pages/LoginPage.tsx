import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import SEO from '@/components/SEO';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码');
      return;
    }
    if (mode === 'register' && !username.trim()) {
      setError('请输入用户名');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, username.trim());
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO title="登录 — 世界观" description="登录世界观，继续用熟悉的世界理解陌生概念。" noIndex />
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5] dark:bg-[#1a1a2e] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="font-serif text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-wide">
            世界观
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            用你熟悉的世界，理解陌生的概念
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 animate-slide-up">
          {/* 标签切换 */}
          <div className="flex border-b border-gray-100 dark:border-gray-700 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 py-2.5 text-sm font-medium transition relative ${
                  mode === m
                    ? 'text-gray-800 dark:text-gray-100'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
                {mode === m && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800 dark:bg-gray-200" />
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="username" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">用户名</label>
                <input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="给自己起个名字"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/50 dark:text-gray-100 rounded-xl border border-transparent dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-400 focus:outline-none transition"
                  autoComplete="username"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">邮箱</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/50 dark:text-gray-100 rounded-xl border border-transparent dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-400 focus:outline-none transition"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-gray-500 dark:text-gray-400 mb-1">密码</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/50 dark:text-gray-100 rounded-xl border border-transparent dark:border-gray-600 focus:border-gray-300 dark:focus:border-gray-400 focus:outline-none transition"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-sm text-white rounded-xl font-medium bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 transition"
            >
              {submitting
                ? '请稍候…'
                : mode === 'login'
                ? '登录'
                : '注册并登录'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          登录后，你的世界记忆和学习记录会自动同步。
        </p>
      </div>
    </div>
    </>
  );
}
