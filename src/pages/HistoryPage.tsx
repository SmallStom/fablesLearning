import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import FableViewer from '@/components/FableViewer';
import ConceptReveal from '@/components/ConceptReveal';
import QuizPanel from '@/components/QuizPanel';
import SEO from '@/components/SEO';
import type { FableResult } from '@/types';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const history = useAppStore((s) => s.history);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const llmConfig = useAppStore((s) => s.llmConfig);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (history.length === 0) {
    return (
      <div className="max-w-reader mx-auto px-4 py-20 text-center">
        <div className="text-gray-300 dark:text-gray-600 text-5xl mb-4">📖</div>
        <p className="text-gray-500 dark:text-gray-400 mb-2">还没有学习记录</p>
        <Link to="/" className="text-sm text-gray-600 dark:text-gray-300 underline">
          去首页选个世界开始吧
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO title="我的学习记录 — 世界观" description="查看你用不同世界理解过的概念，回顾寓言、解析和检验问题。" />
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">学习记录</h1>
        {confirmClear ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">确认清空？</span>
            <button
              onClick={() => {
                clearHistory();
                setConfirmClear(false);
              }}
              className="text-red-500 hover:underline"
            >
              确认
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="text-gray-400 hover:underline"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-sm text-gray-400 hover:text-red-500 transition"
          >
            清空记录
          </button>
        )}
      </div>

      <div className="space-y-3">
        {history.map((f: FableResult) => {
          const open = expandedId === f.id;
          const preview = f.content.slice(0, 50).replace(/\n/g, ' ');
          return (
            <div
              key={f.id}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(open ? null : f.id)}
                className="w-full text-left p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {f.conceptName || f.concept}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {formatDate(f.createdAt)}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {f.worldName} · 概念：{f.concept}
                </div>
                {!open && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-1">
                    {preview}
                  </div>
                )}
              </button>
              {open && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 animate-fade-in">
                  <FableViewer content={f.content} />
                  <ConceptReveal fable={f} />
                  <QuizPanel fable={f} llmConfig={llmConfig} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
