import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/services/api';
import { getWorldMeta } from '@/data/worlds';
import SEO from '@/components/SEO';

interface StatsData {
  totalFables: number;
  byWorld: Record<string, number>;
  recent7Days: number;
  dailyCounts: Record<string, number>;
}

/** 生成最近 30 天的 UTC 日期列表（与后端 created_at 时区一致） */
function getLast30DaysUTC(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - i));
    days.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    );
  }
  return days;
}

/** 根据计数返回热力图颜色等级（0-4） */
function heatLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

const HEAT_COLORS = [
  'bg-gray-100 dark:bg-gray-800',
  'bg-green-200 dark:bg-green-900',
  'bg-green-400 dark:bg-green-700',
  'bg-green-500 dark:bg-green-500',
  'bg-green-600 dark:bg-green-400',
];

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiGet<StatsData>('/api/user/stats', { signal: controller.signal })
      .then((d) => {
        setStats(d);
        setError(null);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : '加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-200 dark:border-gray-700 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-reader mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 dark:text-gray-500 mb-4">{error || '暂无数据'}</p>
        <Link to="/" className="text-sm text-gray-600 dark:text-gray-400 underline">
          返回首页
        </Link>
      </div>
    );
  }

  // 全局空状态
  if (stats.totalFables === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-gray-300 dark:text-gray-700 text-5xl mb-4">📊</div>
        <h1 className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          学习统计
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-4">还没有生成过寓言，开始学习后这里会展示你的进度。</p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-xl text-sm font-medium hover:opacity-90 transition"
        >
          去首页选一个世界
        </Link>
      </div>
    );
  }

  const days = getLast30DaysUTC();
  const maxWorldCount = Math.max(...Object.values(stats.byWorld), 1);

  // 各世界分布（按数量降序）
  const worldEntries = Object.entries(stats.byWorld)
    .map(([wid, count]) => ({
      world: getWorldMeta(wid),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <SEO title="学习统计 — 世界观" description="查看你的学习进度、各世界分布和 30 天学习热力图。" />
      <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">
        学习统计
      </h1>

      {/* 总览数字 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center">
          <div className="text-4xl font-serif font-bold text-gray-800 dark:text-gray-100">
            {stats.totalFables}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            总寓言数
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center">
          <div className="text-4xl font-serif font-bold text-gray-800 dark:text-gray-100">
            {stats.recent7Days}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            最近 7 天生成
          </div>
        </div>
      </div>

      {/* 各世界分布柱状图 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">
          各世界分布
        </h2>
        {worldEntries.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">还没有数据</p>
        ) : (
          <div className="space-y-3">
            {worldEntries.map(({ world, count }) => (
              <div key={world?.id || 'unknown'} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                  <span className="text-lg">{world?.icon || '🌍'}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {world?.name || '未知'}
                  </span>
                </div>
                <div className="flex-1 h-6 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500"
                    style={{
                      width: `${(count / maxWorldCount) * 100}%`,
                      backgroundColor: world?.theme.primary || '#999',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 w-6 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 学习热力图 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">
          学习热力图（最近 30 天）
        </h2>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}
        >
          {days.map((date) => {
            const count = stats.dailyCounts?.[date] ?? 0;
            const level = heatLevel(count);
            return (
              <div
                key={date}
                className={`aspect-square rounded ${HEAT_COLORS[level]} transition-colors`}
                title={`${date}：${count} 篇`}
              />
            );
          })}
        </div>
        {/* 图例 */}
        <div className="flex items-center justify-end gap-1.5 mt-4">
          <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">少</span>
          {HEAT_COLORS.map((c, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded ${c}`}
            />
          ))}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">多</span>
        </div>
      </div>

      {/* 返回首页 */}
      <div className="text-center mt-10">
        <Link
          to="/"
          className="inline-block text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
        >
          ← 返回首页
        </Link>
      </div>
    </div>
    </>
  );
}
