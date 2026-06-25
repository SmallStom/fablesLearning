import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ALL_WORLDS } from '@/data/worlds';
import { trackEvent } from '@/lib/analytics';
import type { WorldMeta } from '@/types';

export default function WorldSettingsPanel() {
  const open = useAppStore((s) => s.worldSettingsOpen);
  const setOpen = useAppStore((s) => s.setWorldSettingsOpen);
  const enabledWorldIds = useAppStore((s) => s.enabledWorldIds);
  const toggleWorld = useAppStore((s) => s.toggleWorld);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-white dark:bg-gray-800 dark:text-gray-100 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-up max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">世界管理</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          启用 / 禁用世界。新增世界：在 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">worlds/</code> 目录下新建文件夹，放入 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">world.json</code> 与 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">system-prompt.md</code> 即自动出现。
        </p>

        <div className="space-y-2">
          {ALL_WORLDS.map((w: WorldMeta) => {
            const enabled = enabledWorldIds.includes(w.id);
            const isExpanded = expanded === w.id;
            return (
              <div
                key={w.id}
                className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-3">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : w.id)}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    <span className="text-2xl">{w.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {w.name}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{w.category}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      toggleWorld(w.id);
                      trackEvent(enabled ? 'disable_world' : 'enable_world', { world_id: w.id });
                    }}
                    className={`relative w-11 h-6 rounded-full transition ${
                      enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    title={enabled ? '已启用' : '已禁用'}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        enabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-300 animate-fade-in">
                    <p className="mb-2">{w.tagline}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                      {w.description}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      示例概念：<span className="text-gray-600 dark:text-gray-300">{w.demoConcept}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-5">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
