import { useState, useRef, useEffect } from 'react';
import { apiPost } from '@/services/api';
import { trackEvent } from '@/lib/analytics';
import type { FableResult } from '@/types';

interface ShareCardProps {
  fable: FableResult;
  worldIcon: string;
  onClose: () => void;
}

export default function ShareCard({ fable, worldIcon, onClose }: ShareCardProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** 获取分享 token */
  const handleCreateShare = async () => {
    // 中断之前的请求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await apiPost<{ shareToken: string }>(
        `/api/fables/${fable.id}/share`,
        undefined,
        { signal: controller.signal }
      );
      setShareToken(data.shareToken);
      trackEvent('share_link_created', { fable_id: fable.id, concept: fable.conceptName || fable.concept });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : '生成分享链接失败');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  };

  // 首次打开时自动生成分享链接
  useEffect(() => {
    if (!shareToken && !loading && !error) {
      handleCreateShare();
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 分享链接（HashRouter 格式，兼容非根路径部署） */
  const shareUrl = shareToken
    ? `${window.location.origin}/#/share/${shareToken}`
    : '';

  /** 寓言摘要（取前 120 字） */
  const summary = fable.content
    .replace(/[#*>\-]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 120);

  /** 复制链接 */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast('链接已复制');
      trackEvent('share_link_copied', { fable_id: fable.id, concept: fable.conceptName || fable.concept });
    } catch {
      setToast('复制失败');
    }
    setTimeout(() => setToast(null), 2500);
  };

  /** 生成图片并下载 */
  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 750;
    const H = 420;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    // 按 DPR 缩放，高清屏输出更清晰
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // 背景
    ctx.fillStyle = '#FAFAF5';
    ctx.fillRect(0, 0, W, H);

    // 顶部装饰条
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, W, 6);

    // 世界图标
    ctx.font = '48px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(worldIcon, 40, 40);

    // 标题：概念名
    ctx.fillStyle = '#2C2C2C';
    ctx.font = 'bold 28px "Noto Serif SC", serif';
    const title = fable.conceptName || fable.concept;
    ctx.fillText(title, 100, 48);

    // 世界名标签
    ctx.fillStyle = '#999';
    ctx.font = '14px "Noto Sans SC", sans-serif';
    ctx.fillText(fable.worldName, 100, 84);

    // 分隔线
    ctx.strokeStyle = '#E5E5E5';
    ctx.beginPath();
    ctx.moveTo(40, 120);
    ctx.lineTo(W - 40, 120);
    ctx.stroke();

    // 寓言摘要（自动换行，超长截断）
    ctx.fillStyle = '#555';
    ctx.font = '16px "Noto Sans SC", sans-serif';
    const maxWidth = W - 80;
    const words = summary.split('');
    let line = '';
    let y = 145;
    let truncated = false;
    for (const ch of words) {
      const testLine = line + ch;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, 40, y);
        line = ch;
        y += 28;
        if (y > 260) {
          truncated = true;
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (line && y <= 290) {
      // 如果被截断，追加省略号
      if (truncated) {
        const withEllipsis = line + '…';
        if (ctx.measureText(withEllipsis).width <= maxWidth) {
          ctx.fillText(withEllipsis, 40, y);
        } else {
          ctx.fillText(line, 40, y);
        }
      } else {
        ctx.fillText(line, 40, y);
      }
    }

    // 底部品牌
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 16px "Noto Serif SC", serif';
    ctx.fillText('世界观', 40, H - 50);
    ctx.fillStyle = '#999';
    ctx.font = '12px "Noto Sans SC", sans-serif';
    ctx.fillText('用你熟悉的世界，理解陌生的概念', 40, H - 28);

    // 下载：必须将 <a> 插入 DOM 才能可靠触发
    const link = document.createElement('a');
    link.download = `世界观-${title}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast('图片已下载');
    trackEvent('share_image_downloaded', { fable_id: fable.id, concept: fable.conceptName || fable.concept });
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          ✕
        </button>

        <div className="p-6">
          {/* 卡片预览 */}
          <div className="bg-[#FAFAF5] dark:bg-gray-700 rounded-xl p-5 mb-5 border dark:border-gray-600">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{worldIcon}</span>
              <div>
                <div className="font-serif font-bold text-gray-800 dark:text-gray-100">
                  {fable.conceptName || fable.concept}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {fable.worldName}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
              {summary}
            </p>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <span className="font-serif text-sm font-bold text-gray-700 dark:text-gray-200">
                世界观
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                用你熟悉的世界，理解陌生的概念
              </span>
            </div>
          </div>

          {/* 分享链接 */}
          {loading && (
            <div className="text-center text-sm text-gray-400 py-2">
              正在生成分享链接…
            </div>
          )}
          {error && (
            <div className="text-center text-sm text-red-500 py-2">{error}</div>
          )}
          {shareUrl && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                分享链接
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 truncate"
                />
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              disabled={!shareUrl}
              className="flex-1 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-40"
            >
              📋 复制链接
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={!shareUrl}
              className="flex-1 px-4 py-2.5 text-sm text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-800 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-40"
            >
              🖼 生成图片
            </button>
          </div>
        </div>

        {/* 隐藏的 canvas 用于生成图片 */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
