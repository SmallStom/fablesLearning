import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { getWorldMeta } from '@/data/worlds';
import WorldCard from '@/components/WorldCard';
import SEO from '@/components/SEO';

export default function HomePage() {
  const enabledWorldIds = useAppStore((s) => s.enabledWorldIds);
  const worlds = enabledWorldIds
    .map((id) => getWorldMeta(id))
    .filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          世界观
        </h1>
        <p className="text-gray-500 leading-relaxed">
          用你熟悉的世界，解释陌生的概念。
        </p>
        <p className="text-sm text-gray-400 mt-2">
          选一个世界，输入一个你看不懂的名词，AI 在那个世界里用一个寓言把它讲明白。
        </p>
      </div>

      {worlds.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          还没有启用的世界，点击右上角「世界管理」启用一个吧。
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
          {worlds.map((w) => (
            <WorldCard key={w!.id} world={w!} />
          ))}
        </div>
      )}

      <div className="text-center mt-12">
        <Link
          to="/history"
          className="inline-block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
        >
          📖 我的学习记录
        </Link>
      </div>
    </div>
  );
}
