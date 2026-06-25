import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import LLMSettings from './LLMSettings';
import WorldSettingsPanel from './WorldSettingsPanel';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const setLLMSettingsOpen = useAppStore((s) => s.setLLMSettingsOpen);
  const setWorldSettingsOpen = useAppStore((s) => s.setWorldSettingsOpen);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // 移动端设置菜单（底部弹出）
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const isHome = location.pathname === '/';
  const isHistory = location.pathname === '/history';
  const isStats = location.pathname === '/stats';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF5] dark:bg-[#1a1a2e]">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-serif text-lg font-bold text-gray-800 dark:text-gray-100 tracking-wide">
            世界观
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              to="/stats"
              className="hidden sm:flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="学习统计"
            >
              <span className="mr-1">📊</span>学习统计
            </Link>
            {/* 桌面端：世界管理 */}
            <button
              onClick={() => setWorldSettingsOpen(true)}
              className="hidden sm:block px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="世界管理"
            >
              <span className="mr-1">🌐</span>世界管理
            </button>
            {/* 桌面端：LLM 设置 */}
            <button
              onClick={() => setLLMSettingsOpen(true)}
              className="hidden sm:block px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="LLM 设置"
            >
              <span className="mr-1">⚙️</span>LLM 设置
            </button>
            {/* 主题切换：桌面端和移动端都显示 */}
            <ThemeToggle />
            {/* 桌面端：用户信息 + 退出 */}
            <div className="hidden sm:flex items-center gap-1.5 pl-1.5 ml-1 border-l border-gray-100 dark:border-gray-700">
              <span className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 dark:text-gray-300">
                <span>{user?.avatar || '👤'}</span>
                <span>{user?.username || '用户'}</span>
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition"
                title="退出登录"
              >
                退出
              </button>
            </div>
            {/* 移动端：只显示用户头像 */}
            <span className="sm:hidden flex items-center px-2 py-1 text-base">
              {user?.avatar || '👤'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        <Outlet />
      </main>

      <footer className="hidden sm:block border-t border-gray-100 dark:border-gray-800 py-5 text-center text-xs text-gray-400 dark:text-gray-600">
        用你熟悉的世界，理解陌生的概念
      </footer>

      {/* 移动端底部导航栏 */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-t border-gray-100 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition ${
              isHome
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <span className="text-lg">🏠</span>
            <span>首页</span>
          </Link>
          <Link
            to="/stats"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition ${
              isStats
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <span className="text-lg">📊</span>
            <span>统计</span>
          </Link>
          <Link
            to="/history"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition ${
              isHistory
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <span className="text-lg">📖</span>
            <span>记录</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs text-gray-400 dark:text-gray-500 transition"
          >
            <span className="text-lg">⚙️</span>
            <span>设置</span>
          </button>
        </div>
      </nav>

      {/* 移动端设置底部弹出菜单 */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slide-up">
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 mb-3">设置</div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setWorldSettingsOpen(true);
              }}
              className="w-full py-3.5 text-left px-4 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition min-h-[44px]"
            >
              🌐 世界管理
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setLLMSettingsOpen(true);
              }}
              className="w-full py-3.5 text-left px-4 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition min-h-[44px]"
            >
              ⚙️ LLM 设置
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3.5 text-left px-4 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition min-h-[44px]"
            >
              🚪 退出登录
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3.5 text-center text-sm text-gray-400 dark:text-gray-500 mt-2 min-h-[44px]"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <LLMSettings />
      <WorldSettingsPanel />
    </div>
  );
}
