import { useState, useEffect } from 'react';

const STORAGE_KEY = 'worldview_theme';

// 读取初始主题偏好：localStorage 优先，否则跟随系统
function getInitialDark(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === 'dark';
  } catch {
    /* localStorage 不可用时忽略 */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      /* 忽略写入失败 */
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="px-2.5 py-1.5 text-base text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700 rounded-lg transition min-w-[36px] min-h-[36px] flex items-center justify-center"
      title={dark ? '切换到亮色模式' : '切换到暗色模式'}
      aria-label="切换主题"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
