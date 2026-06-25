import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_WORLDS } from '@/data/worlds';
import type { WorldMeta } from '@/types';

const STORAGE_KEY = 'worldview_onboarded';

/** 检查是否已完成引导 */
export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** 推荐世界（取前 3 个） */
const RECOMMEND_WORLDS: WorldMeta[] = ALL_WORLDS.slice(0, 3);

/** 玩法说明步骤 */
const PLAY_STEPS = [
  { icon: '✏️', title: '输入概念', desc: '输入一个你看不懂的名词' },
  { icon: '🤖', title: 'AI 生成寓言', desc: '在你熟悉的世界里讲一个故事' },
  { icon: '📖', title: '概念解析', desc: '展开看故事如何映射概念' },
  { icon: '✅', title: '检验理解', desc: '回答问题，确认你真的懂了' },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=欢迎, 1=选世界, 2=玩法说明
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);

  /** 标记完成并关闭 */
  const finish = (worldId?: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    onDone();
    if (worldId) {
      navigate(`/explore/${worldId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 pt-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-6 bg-gray-800 dark:bg-gray-200'
                  : i < step
                  ? 'w-1.5 bg-gray-400 dark:bg-gray-500'
                  : 'w-1.5 bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* 跳过按钮 */}
        <button
          onClick={() => finish()}
          className="absolute top-5 right-5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          跳过
        </button>

        {/* 步骤 0：欢迎页 */}
        {step === 0 && (
          <div className="px-8 py-10 text-center animate-fade-in">
            <div className="text-5xl mb-6">🌍</div>
            <h1 className="font-serif text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              欢迎来到世界观
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
              用你熟悉的世界，解释陌生的概念。
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed mb-8">
              选一个你感兴趣的世界，输入一个你看不懂的名词，
              <br />
              AI 会在那个世界里用一个寓言把它讲明白。
            </p>
            <button
              onClick={() => setStep(1)}
              className="px-8 py-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-xl font-medium text-sm hover:opacity-90 transition"
            >
              开始
            </button>
          </div>
        )}

        {/* 步骤 1：选世界 */}
        {step === 1 && (
          <div className="px-8 py-8 animate-fade-in">
            <h2 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100 text-center mb-2">
              选一个你熟悉的世界
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-6">
              之后可以随时切换
            </p>
            <div className="space-y-3 mb-6">
              {RECOMMEND_WORLDS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWorld(w.id)}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedWorld === w.id
                      ? 'border-gray-800 dark:border-gray-200 bg-gray-50 dark:bg-gray-700'
                      : 'border-gray-100 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <span className="text-3xl">{w.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-100">
                      {w.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {w.tagline}
                    </div>
                  </div>
                  {selectedWorld === w.id && (
                    <span className="text-gray-800 dark:text-gray-200 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                上一步
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!selectedWorld}
                className="flex-1 px-6 py-2.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-xl font-medium text-sm disabled:opacity-30 hover:opacity-90 transition"
              >
                下一步
              </button>
            </div>
          </div>
        )}

        {/* 步骤 2：玩法说明 */}
        {step === 2 && (
          <div className="px-8 py-8 animate-fade-in">
            <h2 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100 text-center mb-6">
              玩法说明
            </h2>
            <div className="space-y-4 mb-8">
              {PLAY_STEPS.map((s, i) => (
                <div key={i} className="relative flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                    {s.icon}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                        {s.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                  {i < PLAY_STEPS.length - 1 && (
                    <div className="absolute left-[19px] top-[44px] w-px h-4 bg-gray-200 dark:bg-gray-600" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                上一步
              </button>
              <button
                onClick={() => finish(selectedWorld || undefined)}
                className="flex-1 px-6 py-2.5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-xl font-medium text-sm hover:opacity-90 transition"
              >
                {selectedWorld ? '进入世界 →' : '完成'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
