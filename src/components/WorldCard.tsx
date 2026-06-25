import { useNavigate } from 'react-router-dom';
import type { WorldMeta } from '@/types';

export default function WorldCard({ world }: { world: WorldMeta }) {
  const navigate = useNavigate();
  const { theme } = world;

  return (
    <button
      onClick={() => navigate(`/explore/${world.id}`)}
      className="group text-left rounded-2xl p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
      style={{ borderLeftWidth: '4px', borderLeftColor: theme.primary }}
    >
      <div className="text-3xl mb-3">{world.icon}</div>
      <div className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
        {world.name}
      </div>
      <div className="text-xs mb-3" style={{ color: theme.secondary }}>
        {world.category}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
        {world.tagline}
      </p>
      <div
        className="mt-3 text-xs font-medium opacity-0 group-hover:opacity-100 transition"
        style={{ color: theme.primary }}
      >
        进入这个世界 →
      </div>
    </button>
  );
}
