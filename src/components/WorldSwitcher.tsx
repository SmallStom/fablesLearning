import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { getWorldMeta } from '@/data/worlds';

export default function WorldSwitcher({
  currentWorldId,
  open,
  onClose,
}: {
  currentWorldId: string;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const enabledWorldIds = useAppStore((s) => s.enabledWorldIds);

  if (!open) return null;

  const others = enabledWorldIds
    .filter((id) => id !== currentWorldId)
    .map((id) => getWorldMeta(id))
    .filter(Boolean);

  const handlePick = (id: string) => {
    onClose();
    navigate(`/explore/${id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 dark:text-gray-100 rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-up">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">换个世界看同一个概念</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">选择另一个世界，用它的视角重新解释</p>

        {others.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            没有其他已启用的世界，去「世界管理」启用更多。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {others.map((w) => (
              <button
                key={w!.id}
                onClick={() => handlePick(w!.id)}
                className="text-left p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md hover:-translate-y-0.5 transition-all"
                style={{ borderLeftWidth: '3px', borderLeftColor: w!.theme.primary }}
              >
                <div className="text-2xl mb-1">{w!.icon}</div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{w!.name}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                  {w!.tagline}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
