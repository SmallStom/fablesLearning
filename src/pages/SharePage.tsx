import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicGet } from '@/services/api';
import ReactMarkdown from 'react-markdown';
import SEO from '@/components/SEO';
import type { FableMapping } from '@/types';

interface ShareData {
  concept: string;
  conceptName: string;
  conceptDefinition: string;
  content: string;
  worldName: string;
  worldIcon: string;
  mappings: FableMapping[];
  createdAt: string;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export default function SharePage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    publicGet<ShareData>(`/api/share/${token}`, { signal: controller.signal })
      .then((d) => {
        setData(d);
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
  }, [token]);

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5] dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">正在加载分享内容…</p>
        </div>
      </div>
    );
  }

  // 出错
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5] dark:bg-gray-900 px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">😔</div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {error || '分享内容不存在'}
          </p>
          <Link
            to="/"
            className="inline-block mt-4 text-sm text-gray-600 dark:text-gray-300 underline"
          >
            返回世界观首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={data ? `用「${data.worldName}」解释「${data.conceptName || data.concept}」— 世界观` : '分享 — 世界观'}
        description={data ? `在「${data.worldName}」的世界里，用一则寓言理解「${data.conceptName || data.concept}」。` : '有人用世界观生成了一则寓言，分享给你。'}
        type="article"
      />
      <div className="min-h-screen bg-[#FAFAF5] dark:bg-gray-900 flex flex-col">
      {/* 顶部 Logo */}
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-reader mx-auto px-4 h-14 flex items-center justify-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold text-gray-800 dark:text-gray-100">
              世界观
            </span>
          </Link>
        </div>
      </header>

      {/* 寓言内容 */}
      <main className="flex-1 max-w-reader mx-auto w-full px-4 py-10">
        {/* 世界标签 */}
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-400 dark:text-gray-500">
          <span className="text-xl">{data.worldIcon}</span>
          <span>{data.worldName}</span>
          <span>·</span>
          <span>{formatDate(data.createdAt)}</span>
        </div>

        {/* 寓言正文 */}
        <div className="fable-content dark:text-gray-200">
          <ReactMarkdown>{data.content}</ReactMarkdown>
        </div>
        <div className="text-center text-gray-300 dark:text-gray-600 text-lg mt-8 mb-6">
          ✦
        </div>

        {/* 概念解析 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">概念</div>
          <div className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
            {data.conceptName || data.concept}
          </div>
          {data.conceptDefinition && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              {data.conceptDefinition}
            </p>
          )}

          {data.mappings.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                故事 → 概念映射
              </div>
              <ul className="space-y-2">
                {data.mappings.map((m, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex gap-2"
                  >
                    <span className="text-gray-400 dark:text-gray-500 mt-0.5">·</span>
                    <span>
                      <span className="text-gray-800 dark:text-gray-100">
                        {m.storyElement}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1.5">→</span>
                      <span>{m.conceptPart}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* 底部 CTA */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-10">
        <div className="max-w-reader mx-auto px-4 text-center">
          <p className="font-serif text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
            来世界观
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">
            用你熟悉的世界，理解更多概念
          </p>
          <Link
            to="/"
            className="inline-block px-8 py-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 rounded-xl font-medium text-sm hover:opacity-90 transition"
          >
            开始探索 →
          </Link>
        </div>
      </footer>
    </div>
    </>
  );
}
